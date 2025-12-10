import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Button, Space, Tag, Spin, message, Modal, Select, Rate, Empty, Input } from 'antd'; 
import { 
    InboxOutlined, EyeOutlined, DeleteOutlined, 
    DollarCircleOutlined, SwapOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined 
} from '@ant-design/icons'
// Đảm bảo import các hàm Firestore cần thiết
import { 
    collection, onSnapshot, query, Firestore, DocumentData, doc, updateDoc, QuerySnapshot, DocumentSnapshot, Timestamp, deleteDoc,
    getDocs, where 
} from 'firebase/firestore'; 

// Import Context để lấy db (Giả định bạn có FirebaseContext)
import { useFirebase } from '../context/FirebaseContext'; 
const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input; // Dùng TextArea cho phản hồi

// --- 1. ĐỊNH NGHĨA TYPES & CONSTANTS ---

interface OrderItem {
    id: string;
    image: string;
    name: string;
    price: number;
    quantity: number;
    note?: string;
}

interface Order {
    id: string;
    customerName: string;
    userId: string;
    phone: string;
    address: string;
    totalPrice: number;
    status: 'pending' | 'shipped' | 'delivered' | 'cancelled';
    paymentMethod: 'cod' | 'paid';
    isPaid: boolean;
    date: Timestamp; 
    items: OrderItem[];
}

// CẬP NHẬT: Interface cho Review với adminReply
interface Review {
    id: string;
    productName: string;
    rating: number; // 1-5 sao
    comment: string;
    userName: string;
    createdAt: Timestamp;
    adminReply?: string; // TRƯỜNG PHẢN HỒI
}

// Map trạng thái đơn hàng sang màu sắc Ant Design
const statusColorMap = {
    pending: 'orange',
    shipped: 'blue',
    delivered: 'green',
    cancelled: 'red',
};
const statusIconMap = {
    pending: <ClockCircleOutlined />,
    shipped: <SwapOutlined />,
    delivered: <CheckCircleOutlined />,
    cancelled: <CloseCircleOutlined />,
};

// Map phương thức thanh toán
const paymentMethodMap = {
    cod: 'COD', 
    paid: 'ONLINE', 
};

// --- 2. COMPONENT MODAL CHI TIẾT & CẬP NHẬT ĐƠN HÀNG ---

interface OrderDetailModalProps {
    order: Order | null;
    onClose: () => void;
    onFetchReviews: (orderId: string) => Promise<Review[]>;
    onUpdateStatus: (orderId: string, updates: { status?: Order['status'], isPaid?: boolean }) => Promise<void>; 
    // Prop xử lý phản hồi
    onReplyToReview: (reviewId: string, replyContent: string) => Promise<void>; 
}

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ order, onClose, onUpdateStatus, onFetchReviews, onReplyToReview }) => {
    const [newStatus, setNewStatus] = useState<Order['status']>(order?.status || 'pending');
    const [newIsPaid, setNewIsPaid] = useState<boolean>(order?.isPaid || false);
    const [isUpdating, setIsUpdating] = useState(false);
    
    // States cho Reviews
    const [reviews, setReviews] = useState<Review[] | null>(null);
    const [isReviewsLoading, setIsReviewsLoading] = useState(true);
    
    // States cho Phản hồi
    const [replyingReviewId, setReplyingReviewId] = useState<string | null>(null);
    const [currentReply, setCurrentReply] = useState('');
    const [isReplying, setIsReplying] = useState(false); 


    useEffect(() => {
        if (order) {
            setNewStatus(order.status);
            setNewIsPaid(order.isPaid); 
            
            // Tải reviews khi order thay đổi
            setIsReviewsLoading(true);
            setReviews(null); 
            onFetchReviews(order.id)
                .then(fetchedReviews => {
                    setReviews(fetchedReviews);
                })
                .catch(err => {
                    console.error("Lỗi tải reviews:", err);
                    message.error('Không thể tải đánh giá sản phẩm.');
                    setReviews([]);
                })
                .finally(() => {
                    setIsReviewsLoading(false);
                });
        }
    }, [order, onFetchReviews]); 
    
    // Hàm xử lý gửi phản hồi
    const handleSendReply = async () => {
        if (!replyingReviewId || currentReply.trim() === '') {
            message.warning('Vui lòng nhập nội dung phản hồi.');
            return;
        }

        setIsReplying(true);
        try {
            await onReplyToReview(replyingReviewId, currentReply.trim());
            
            // Sau khi gửi thành công, reset trạng thái
            const newReply = currentReply.trim();
            setReplyingReviewId(null);
            setCurrentReply('');
            
            // Cập nhật reviews state để phản hồi hiện ra ngay lập tức
            if (reviews) {
                setReviews(reviews.map(r => 
                    r.id === replyingReviewId ? { ...r, adminReply: newReply } : r
                ));
            }
        } catch (error) {
            console.error("Lỗi khi gửi phản hồi:", error);
            message.error('Lỗi khi gửi phản hồi.');
        } finally {
            setIsReplying(false);
        }
    };

    const handleUpdate = async () => {
        // ... (Giữ nguyên logic cập nhật)
        if (!order) return;

        const updates: { status?: Order['status'], isPaid?: boolean } = {};

        if (newStatus !== order.status) {
            if ((order.status === 'delivered' || order.status === 'cancelled') && newStatus !== order.status) {
                message.error('Không thể cập nhật trạng thái của đơn hàng đã hoàn tất hoặc bị hủy.');
                return;
            }
            updates.status = newStatus;
        }

        if (newIsPaid !== order.isPaid) {
             updates.isPaid = newIsPaid;
        }
        
        if (Object.keys(updates).length === 0) {
             message.info('Không có trường nào thay đổi để cập nhật.');
             return;
        }

        setIsUpdating(true);
        await onUpdateStatus(order.id, updates); 
        setIsUpdating(false);
    };

    if (!order) return null;
    
    const isUpdateDisabled = 
        ((newStatus === order.status) && (newIsPaid === order.isPaid)) || 
        (order.status === 'delivered' || order.status === 'cancelled'); 

    return (
        <Modal
            title={`Chi Tiết Đơn Hàng #${order.id.substring(0, 8)}`}
            open={!!order}
            onCancel={onClose}
            footer={[
                <Button key="back" onClick={onClose}>
                    Đóng
                </Button>,
                <Button 
                    key="submit" 
                    type="primary" 
                    onClick={handleUpdate} 
                    loading={isUpdating}
                    disabled={isUpdateDisabled}
                    style={{ backgroundColor: isUpdateDisabled ? undefined : '#FF6F00' }}
                >
                    Cập Nhật
                </Button>,
            ]}
            width={800}
        >
            <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                <Col span={12}>
                    <Title level={5}>Thông Tin Khách Hàng</Title>
                    <Text>Tên: **{order.customerName}**</Text><br />
                    <Text>SĐT: {order.phone}</Text><br />
                    <Text>Địa chỉ: *{order.address}*</Text>
                </Col>
                <Col span={12}>
                    <Title level={5}>Thông Tin Thanh Toán</Title>
                    <Text>Tổng tiền: **{order.totalPrice.toLocaleString('vi-VN')} đ**</Text><br />
                    <Text>Phương thức: **{paymentMethodMap[order.paymentMethod] === 'COD' ? 'Thanh toán khi nhận hàng' : 'Đã thanh toán Online'}**</Text><br />
                    <Text>Trạng thái: <Tag color={order.isPaid ? 'green' : 'red'}>{order.isPaid ? 'Đã thanh toán' : 'Chưa thanh toán'}</Tag></Text>
                </Col>
            </Row>

            <Row gutter={16}>
                <Col span={12}>
                    <Title level={5} style={{ marginTop: 20 }}>Cập Nhật TT Thanh Toán</Title>
                    <Space>
                        <Text>Trạng thái:</Text>
                        <Select 
                            value={newIsPaid ? 'paid' : 'unpaid'} 
                            style={{ width: 180 }} 
                            onChange={value => setNewIsPaid(value === 'paid')}
                            disabled={order.status === 'delivered' || order.status === 'cancelled'}
                        >
                            <Option value="paid">Đã thanh toán</Option>
                            <Option value="unpaid">Chưa thanh toán</Option>
                        </Select>
                    </Space>
                </Col>
                <Col span={12}>
                    <Title level={5} style={{ marginTop: 20 }}>Cập Nhật TT Đơn Hàng</Title>
                    <Space>
                        <Text>Chuyển sang:</Text>
                        <Select 
                            value={newStatus} 
                            style={{ width: 180 }} 
                            onChange={value => setNewStatus(value as Order['status'])}
                            disabled={order.status === 'delivered' || order.status === 'cancelled'}
                        >
                            <Option 
                                value="pending" 
                                disabled={order.status !== 'pending'}
                            >
                                Chờ xử lý
                            </Option>
                            <Option 
                                value="shipped" 
                                disabled={order.status !== 'pending'}
                            >
                                Đang giao
                            </Option>
                            <Option 
                                value="delivered" 
                                disabled={order.status !== 'shipped'}>
                                Đã giao
                            </Option>
                            <Option 
                                value="cancelled" 
                                disabled={order.status === 'delivered' || order.status === 'cancelled'}
                            >
                                Hủy đơn hàng
                            </Option>
                        </Select>
                    </Space>
                </Col>
            </Row>

            <Title level={5} style={{ marginTop: 30, marginBottom: 15 }}>Sản Phẩm Đã Đặt ({order.items.length})</Title>
            <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #f0f0f0', borderRadius: 8, padding: 10 }}>
                {order.items.map((item, index) => (
                    <Row key={index} style={{ padding: '8px 0', borderBottom: index < order.items.length - 1 ? '1px dotted #e8e8e8' : 'none' }} align="middle">
                        <Col span={4}>
                            <img src={item.image || 'https://via.placeholder.com/50'} alt={item.name} style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4 }} />
                        </Col>
                        <Col span={10}>
                            <Text strong>{item.name}</Text><br />
                            <Text type="secondary" style={{ fontSize: 12 }}>ID: {item.id}</Text>
                        </Col>
                        <Col span={5}>
                            <Text>{item.quantity} x {item.price.toLocaleString('vi-VN')} đ</Text>
                        </Col>
                        <Col span={5} style={{ textAlign: 'right' }}>
                            <Text strong>{(item.quantity * item.price).toLocaleString('vi-VN')} đ</Text>
                        </Col>
                    </Row>
                ))}
            </div>
            
            {/* PHẦN ĐÁNH GIÁ (REVIEWS) VÀ PHẢN HỒI */}
            <Title level={5} style={{ marginTop: 30, marginBottom: 15 }}>Đánh Giá Sản Phẩm</Title>
            <div style={{ padding: 10, border: '1px solid #f0f0f0', borderRadius: 8 }}>
                {isReviewsLoading ? (
                    <div style={{ textAlign: 'center' }}><Spin /> Đang tải đánh giá...</div>
                ) : (
                    reviews && reviews.length > 0 ? (
                        reviews.map((review, index) => (
                            <div key={review.id} style={{ padding: '10px 0', borderBottom: index < reviews.length - 1 ? '1px dotted #e8e8e8' : 'none' }}>
                                <Row align="top" gutter={[16, 8]}>
                                    <Col span={10}>
                                        <Text strong>{review.productName}</Text>
                                    </Col>
                                    <Col span={14}>
                                        <Rate disabled defaultValue={review.rating} />
                                        <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                                            Bởi **{review.userName}** ({review.createdAt.toDate().toLocaleDateString('vi-VN')})
                                        </Text>
                                    </Col>
                                    <Col span={24}>
                                        <Text italic>{review.comment}</Text>
                                    </Col>
                                </Row>
                                
                                {/* HIỂN THỊ PHẢN HỒI CỦA ADMIN (Nếu có) */}
                                {review.adminReply && (
                                    <div style={{ marginTop: 10, padding: 8, backgroundColor: '#f5f5f5', borderRadius: 4, marginLeft: 20 }}>
                                        <Text strong style={{ color: '#FF6F00' }}>Phản hồi của Admin:</Text><br/>
                                        <Text>{review.adminReply}</Text>
                                    </div>
                                )}
                                
                                {/* FORM PHẢN HỒI */}
                                <div style={{ marginTop: 10, marginLeft: 20 }}>
                                    {review.id === replyingReviewId ? (
                                        <Space direction="vertical" style={{ width: '100%' }}>
                                            <TextArea
                                                rows={2}
                                                placeholder="Nhập phản hồi của bạn..."
                                                value={currentReply}
                                                onChange={(e) => setCurrentReply(e.target.value)}
                                            />
                                            <Space>
                                                <Button 
                                                    type="primary" 
                                                    size="small"
                                                    onClick={handleSendReply}
                                                    loading={isReplying}
                                                    style={{ backgroundColor: '#FF6F00' }}
                                                >
                                                    Gửi Phản Hồi
                                                </Button>
                                                <Button 
                                                    size="small" 
                                                    onClick={() => { setReplyingReviewId(null); setCurrentReply(''); }}
                                                    disabled={isReplying}
                                                >
                                                    Hủy
                                                </Button>
                                            </Space>
                                        </Space>
                                    ) : (
                                        <Button 
                                            size="small" 
                                            onClick={() => { 
                                                setReplyingReviewId(review.id); 
                                                setCurrentReply(review.adminReply || ''); // Điền phản hồi cũ nếu có
                                            }}
                                            disabled={isReplying}
                                        >
                                            {review.adminReply ? 'Chỉnh sửa Phản hồi' : 'Phản hồi'}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <Empty 
                            image={Empty.PRESENTED_IMAGE_SIMPLE} 
                            description="Chưa có đánh giá nào cho đơn hàng này." 
                        />
                    )
                )}
            </div>
            
        </Modal>
    );
};


// --- 3. COMPONENT QUẢN LÝ ĐƠN HÀNG CHÍNH ---

const customStyles = {
    tableHeader: {
        padding: '12px 0',
        borderBottom: '2px solid #555', 
        marginBottom: 16,
        color: '#333',
        fontWeight: 'bold' as const, 
        backgroundColor: '#f9f9f9', 
        display: 'flex' as const,
        alignItems: 'middle',
    },
    tableRow: {
        padding: '12px 0',
        borderBottom: '1px dotted #e8e8e8', 
        alignItems: 'middle',
        display: 'flex' as const,
    },
    emptyTable: {
        textAlign: 'center' as const,
        padding: 50,
        color: '#999',
    },
};

const OrderManagement: React.FC = () => {
    const { db, isAuthReady } = useFirebase();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    // Logic tải đơn hàng
    useEffect(() => {
        if (!isAuthReady || !db) {
            if (!isAuthReady) setLoading(true); 
            return;
        }

        setLoading(true);
        const ordersCollectionRef = collection(db as Firestore, `orders`);
        const q = query(ordersCollectionRef);

        const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
            const ordersData: Order[] = [];
            snapshot.forEach((doc: DocumentSnapshot<DocumentData>) => {
                const data = doc.data() as DocumentData;
                
                ordersData.push({
                    id: doc.id,
                    customerName: data.customerName || 'Khách hàng ẩn danh',
                    userId: data.userId || 'N/A',
                    phone: data.phone || 'N/A',
                    address: data.address || 'N/A',
                    totalPrice: data.totalPrice || 0,
                    status: data.status || 'pending',
                    paymentMethod: data.paymentMethod || 'cod',
                    isPaid: data.isPaid || false,
                    date: data.date || data.createdAt || Timestamp.now(), 
                    items: data.items || [],
                } as Order);
            });
            setOrders(ordersData.sort((a, b) => b.date.toMillis() - a.date.toMillis())); 
            setLoading(false);
        }, (error: unknown) => { 
            console.error("Lỗi khi tải dữ liệu đơn hàng:", error);
            setLoading(false);
            message.error('Không thể tải dữ liệu đơn hàng.');
        });

        return () => unsubscribe();
    }, [db, isAuthReady]);
    
    // Logic LẤY REVIEWS
    const handleFetchReviews = async (orderId: string): Promise<Review[]> => {
        if (!db) return [];

        try {
            const reviewsCollectionRef = collection(db as Firestore, 'reviews');
            const q = query(reviewsCollectionRef, where('orderId', '==', orderId)); 
            
            const snapshot = await getDocs(q);
            
            const fetchedReviews: Review[] = [];
            snapshot.forEach(doc => {
                const data = doc.data() as DocumentData;
                fetchedReviews.push({
                    id: doc.id,
                    productName: data.productName || 'Sản phẩm không rõ tên',
                    rating: data.rating || 5,
                    comment: data.comment || 'Không có bình luận',
                    userName: data.userName || 'Khách hàng',
                    createdAt: data.createdAt || Timestamp.now(),
                    adminReply: data.adminReply || undefined, // Lấy adminReply
                });
            });
            return fetchedReviews;
        } catch (error) {
            console.error("Lỗi khi fetch reviews:", error);
            throw error;
        }
    };
    
    // LOGIC PHẢN HỒI ĐÁNH GIÁ (Hàm mới)
    const handleReplyToReview = async (reviewId: string, replyContent: string) => {
        if (!db) {
            message.error("Kết nối database chưa sẵn sàng.");
            throw new Error("DB not ready");
        }

        try {
            const reviewDocRef = doc(db, `reviews`, reviewId);
            
            await updateDoc(reviewDocRef, {
                adminReply: replyContent,
                repliedAt: Timestamp.now(), 
            });
            
            message.success(`Đã gửi phản hồi thành công.`);
        } catch (error) {
            console.error("Lỗi khi phản hồi đánh giá:", error);
            message.error('Lỗi khi phản hồi đánh giá.');
            throw error;
        }
    };


    const handleUpdateOrderStatus = async (orderId: string, updates: { status?: Order['status'], isPaid?: boolean }) => {
        // ... (Logic cập nhật cũ giữ nguyên)
        if (!db) {
            message.error("Kết nối database chưa sẵn sàng.");
            return;
        }

        try {
            const orderDocRef = doc(db, `orders`, orderId);
            
            const updateData: DocumentData = {
                ...updates,
                updatedAt: Timestamp.now(), 
            };
            
            await updateDoc(orderDocRef, updateData);

            let successMessage = `Đã cập nhật đơn hàng #${orderId.substring(0, 8)}.`;
            if (updates.status) {
                successMessage += ` Trạng thái đơn hàng: **${updates.status}**`;
            }
            if (updates.isPaid !== undefined) {
                 successMessage += ` Trạng thái thanh toán: **${updates.isPaid ? 'Đã thanh toán' : 'Chưa thanh toán'}**`;
            }
            
            message.success(successMessage);
            
            setSelectedOrder(null); 
        } catch (error) {
            console.error("Lỗi khi cập nhật đơn hàng:", error);
            message.error('Lỗi khi cập nhật đơn hàng.');
        }
    };
    
    const handleDeleteOrder = (orderId: string) => {
        if (!db) {
            message.error("Kết nối database chưa sẵn sàng.");
            return;
        }

        Modal.confirm({
            title: 'Xác nhận xóa đơn hàng',
            content: `Bạn có chắc chắn muốn xóa vĩnh viễn đơn hàng #${orderId.substring(0, 8)}...? Thao tác này không thể hoàn tác!`,
            okText: 'Xóa',
            okType: 'danger',
            cancelText: 'Hủy',
            onOk: async () => {
                try {
                    const orderDocRef = doc(db, `orders`, orderId);
                    await deleteDoc(orderDocRef);

                    message.success(`Đã xóa thành công đơn hàng #${orderId.substring(0, 8)}.`);
                    
                    if (selectedOrder && selectedOrder.id === orderId) {
                        setSelectedOrder(null);
                    }
                } catch (error) {
                    console.error("Lỗi khi xóa đơn hàng:", error);
                    message.error('Lỗi khi xóa đơn hàng.');
                }
            },
        });
    };

    const handleViewDetails = (order: Order) => {
        setSelectedOrder(order);
    };


    // Hàm render danh sách đơn hàng
    const renderOrderList = () => {
        if (loading) {
            return (
                <div style={customStyles.emptyTable}>
                    <Spin size="large" tip="Đang tải danh sách đơn hàng..." />
                </div>
            );
        }
        
        if (orders.length === 0) {
            return (
                <div style={customStyles.emptyTable}>
                    <InboxOutlined style={{ fontSize: 48, color: '#e0e0e0', marginBottom: 16 }} />
                    <Text type="secondary">Chưa có đơn hàng nào</Text>
                </div>
            );
        }

        return (
            <div>
                {orders.map(order => (
                    <Row key={order.id} style={customStyles.tableRow} gutter={8} align="middle">
                        {/* 1. Mã Đơn Hàng (span 3) */}
                        <Col span={3}>
                            <Text strong>#{order.id.substring(0, 8)}...</Text>
                        </Col>
                        {/* 2. Khách Hàng (span 3) */}
                        <Col span={3}>
                            <Text>{order.customerName}</Text>
                        </Col>
                        {/* 3. Trạng Thái (span 3) */}
                        <Col span={3}>
                            <Tag color={statusColorMap[order.status]} icon={statusIconMap[order.status]}>
                                {order.status.toUpperCase()}
                            </Tag>
                        </Col>
                        
                        {/* 4. THANH TOÁN (span 4) */}
                        <Col span={4}>
                            <Tag 
                                color={order.isPaid ? 'green' : 'volcano'} 
                                icon={<DollarCircleOutlined />}
                                style={{ marginRight: 5 }}
                            >
                                {order.isPaid ? 'ĐÃ TT' : 'CHƯA TT'}
                            </Tag>
                            <Tag color="blue">
                                {paymentMethodMap[order.paymentMethod]}
                            </Tag>
                        </Col>
                        
                        {/* 5. Tổng Tiền (span 4, Căn phải) */}
                        <Col span={4} style={{ textAlign: 'right' }}> 
                            <Text strong style={{ color: '#FF6F00' }}>{order.totalPrice.toLocaleString('vi-VN')} đ</Text>
                        </Col>
                        
                        {/* 6. Ngày Đặt (span 3) */}
                        <Col span={3}>
                            <Text type="secondary">{order.date.toDate().toLocaleDateString('vi-VN')}</Text>
                        </Col>

                        {/* 7. Hành Động (span 4, Căn giữa) */}
                        <Col span={4} style={{ textAlign: 'center' }}> 
                            <Space size="small"> 
                                <Button 
                                    icon={<EyeOutlined />} 
                                    size="small" 
                                    onClick={() => handleViewDetails(order)}
                                    title="Xem chi tiết"
                                />
                                <Button 
                                    icon={<DeleteOutlined />} 
                                    size="small" 
                                    danger 
                                    onClick={() => handleDeleteOrder(order.id)}
                                    title="Xóa đơn hàng"
                                />
                            </Space>
                        </Col>
                    </Row>
                ))}
            </div>
        );
    };
    
    // --- MAIN RENDER LOGIC ---

    return (
        <>
            <Card 
                title={<Title level={4} style={{ margin: 0 }}>Quản Lý Đơn Hàng</Title>}
                style={{ borderRadius: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} 
            >
                <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                    Theo dõi, cập nhật trạng thái đơn hàng và trạng thái thanh toán.
                </Text>
                
                {/* Header của bảng: ĐÃ CÂN ĐỐI LẠI SPAN (3, 3, 3, 4, 4, 3, 4) */}
                <Row style={customStyles.tableHeader} gutter={8} align="middle">
                    <Col span={3}><Text strong>Mã Đơn Hàng</Text></Col>
                    <Col span={3}><Text strong>Khách Hàng</Text></Col>
                    <Col span={3}><Text strong>Trạng Thái</Text></Col>
                    <Col span={4}><Text strong>Thanh Toán</Text></Col> 
                    <Col span={4} style={{ textAlign: 'right' }}><Text strong>Tổng Tiền</Text></Col> 
                    <Col span={3}><Text strong>Ngày Đặt</Text></Col> 
                    <Col span={4} style={{ textAlign: 'center' }}><Text strong>Hành Động</Text></Col> 
                </Row>

                {renderOrderList()}
            </Card>

            <OrderDetailModal
                order={selectedOrder}
                onClose={() => setSelectedOrder(null)}
                onUpdateStatus={handleUpdateOrderStatus}
                onFetchReviews={handleFetchReviews}
                onReplyToReview={handleReplyToReview} // Truyền hàm xử lý Phản hồi
            />
        </>
    );
};

export default OrderManagement;