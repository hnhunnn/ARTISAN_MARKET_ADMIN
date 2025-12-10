import React, { useState, useEffect, useMemo } from 'react';
import { Card, Row, Col, Typography, Button, Tag, Spin, message } from 'antd';
import {
    WalletOutlined,
    InboxOutlined,
    AppstoreOutlined,
    UsergroupAddOutlined,
    FileTextOutlined,
    EyeOutlined,
    ClockCircleOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    SyncOutlined
} from '@ant-design/icons';
import { collection, onSnapshot, query, Firestore, QuerySnapshot, DocumentData, Timestamp, limit, orderBy } from 'firebase/firestore'; 

// Import Context để lấy db
import { useFirebase } from '../context/FirebaseContext'; 
// Giả định file KPICard nằm ở đường dẫn này:
import KPICard from '../components/KPICard'; 

const { Title, Text } = Typography;

// --- Định nghĩa Types (Tái sử dụng từ OrderManagement) ---

interface OrderItem {
    id: string;
    price: number;
    quantity: number;
}
interface Order {
    id: string;
    customerName: string;
    totalPrice: number;
    status: 'pending' | 'shipped' | 'delivered' | 'cancelled';
    date: Timestamp;
    items: OrderItem[];
}
interface Product {
    id: string;
    stock: number; // Tên biến trong code (sẽ được gán từ data.quantity của Firebase)
}
interface User {
    id: string;
    createdAt: Timestamp; 
}

// Map trạng thái đơn hàng sang màu sắc Ant Design
const statusColorMap = {
    pending: 'orange',
    shipped: 'blue',
    delivered: 'green',
    cancelled: 'red',
};

// --- Styles ---

const customStyles = {
    tableHeader: {
        padding: '12px 0',
        borderBottom: '1px solid #f0f0f0',
        marginBottom: 16,
        color: '#555',
        display: 'flex' as const,
        alignItems: 'middle',
    },
    tableRow: {
        padding: '12px 0',
        borderBottom: '1px dotted #f0f0f0',
        alignItems: 'middle',
        display: 'flex' as const,
    },
    emptyTable: {
        textAlign: 'center' as const, 
        padding: 50,
        color: '#999',
    }
};

/**
 * Giao diện Tổng Quan (Dashboard Overview) cho Admin.
 */
const DashboardOverview: React.FC = () => {
    const { db, isAuthReady } = useFirebase();
    const [orders, setOrders] = useState<Order[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    // Lấy tất cả dữ liệu cần thiết cho Dashboard
    useEffect(() => {
        if (!isAuthReady || !db) return;

        // 1. ORDERS
        const ordersCollectionRef = collection(db as Firestore, 'orders');
        // const qOrders = query(ordersCollectionRef, orderBy('date', 'desc'), limit(5)); // Dùng dòng này để chỉ tải 5 đơn hàng đầu
        
        const unsubscribeOrders = onSnapshot(ordersCollectionRef, (snapshot: QuerySnapshot<DocumentData>) => {
            const ordersData: Order[] = [];
            let currentTotalRevenue = 0;

            snapshot.forEach(doc => {
                const data = doc.data() as DocumentData;
                const order: Order = {
                    id: doc.id,
                    customerName: data.customerName || 'N/A',
                    totalPrice: data.totalPrice || 0,
                    status: data.status || 'pending',
                    date: data.date || Timestamp.now(),
                    items: data.items || []
                };

                if (order.status === 'delivered') {
                    currentTotalRevenue += order.totalPrice;
                }

                ordersData.push(order);
            });
            
            // Cập nhật state (Sắp xếp theo ngày giảm dần)
            setOrders(ordersData.sort((a, b) => b.date.toMillis() - a.date.toMillis())); 
        }, (error) => {
            console.error("Lỗi khi tải đơn hàng:", error);
            message.error('Không thể tải dữ liệu đơn hàng.');
        });
        
        // 2. PRODUCTS (Tính tổng sản phẩm tồn kho)
        const productsCollectionRef = collection(db as Firestore, 'products');
        const unsubscribeProducts = onSnapshot(productsCollectionRef, (snapshot: QuerySnapshot<DocumentData>) => {
            const productsData: Product[] = [];
            snapshot.forEach(doc => {
                const data = doc.data() as DocumentData;
                productsData.push({
                    id: doc.id,
                    // === ĐÃ SỬA LỖI: Đọc data.quantity thay vì data.stock ===
                    stock: data.quantity || 0, 
                });
            });
            setProducts(productsData);
        }, (error) => {
            console.error("Lỗi khi tải sản phẩm:", error);
        });

        // 3. USERS (Tính khách hàng mới)
        const usersCollectionRef = collection(db as Firestore, 'users');
        const unsubscribeUsers = onSnapshot(usersCollectionRef, (snapshot: QuerySnapshot<DocumentData>) => {
            const usersData: User[] = [];
            snapshot.forEach(doc => {
                 const data = doc.data() as DocumentData;
                 usersData.push({
                    id: doc.id,
                    createdAt: data.createdAt || Timestamp.now()
                 });
            });
            setUsers(usersData);
            setLoading(false);
        }, (error) => {
            console.error("Lỗi khi tải người dùng:", error);
            setLoading(false);
        });

        return () => {
            unsubscribeOrders();
            unsubscribeProducts();
            unsubscribeUsers();
        };
    }, [db, isAuthReady]);


    // --- 🔑 Tính toán các chỉ số KPI ---
    const { totalRevenue, totalOrders, totalStock, newUsersThisMonth } = useMemo(() => {
        // Tổng doanh thu (Chỉ tính Delivered)
        const totalRevenue = orders
            .filter(o => o.status === 'delivered')
            .reduce((sum, order) => sum + order.totalPrice, 0);

        // Tổng đơn hàng (Tất cả trạng thái)
        const totalOrders = orders.length;

        // Tổng tồn kho (Sử dụng giá trị 'stock' đã được gán từ 'quantity')
        const totalStock = products.reduce((sum, product) => sum + product.stock, 0);

        // Khách hàng mới trong tháng này
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const newUsersThisMonth = users.filter(user => {
            const userDate = user.createdAt?.toDate();
            return userDate && userDate >= startOfMonth;
        }).length;

        return { totalRevenue, totalOrders, totalStock, newUsersThisMonth };
    }, [orders, products, users]);


    // --- Phần hiển thị Đơn hàng mới nhất ---
    const renderLatestOrders = () => {
        if (loading) {
            return (
                <div style={customStyles.emptyTable}>
                    <Spin tip="Đang tải dữ liệu..." />
                </div>
            );
        }

        const latest5Orders = orders.slice(0, 5); // Lấy 5 đơn hàng mới nhất
        
        if (latest5Orders.length === 0) {
            return (
                <div style={customStyles.emptyTable}>
                    <FileTextOutlined style={{ fontSize: 48, color: '#e0e0e0', marginBottom: 16 }} />
                    <Text type="secondary">Chưa có đơn hàng nào gần đây.</Text>
                </div>
            );
        }

        return (
            <div>
                {latest5Orders.map(order => (
                    <Row key={order.id} style={customStyles.tableRow} gutter={8} align="middle">
                        <Col span={6}>
                            <Text strong>#{order.id.substring(0, 8)}...</Text>
                        </Col>
                        <Col span={6}>
                            <Text>{order.customerName}</Text>
                        </Col>
                        <Col span={6}>
                            <Tag color={statusColorMap[order.status]}>
                                {order.status.toUpperCase()}
                            </Tag>
                        </Col>
                        <Col span={6}>
                            <Text strong>{order.totalPrice.toLocaleString('vi-VN')} đ</Text>
                        </Col>
                        {/* Có thể thêm nút xem chi tiết nếu cần */}
                    </Row>
                ))}
            </div>
        );
    };
    
    // --- MAIN RENDER LOGIC ---

    return (
        <>
            <Title level={3} style={{ margin: 0 }}>Tổng Quan</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>Chào mừng trở lại, **Admin** 👋</Text>
            
            {/* HÀNG KPI CARDS */}
            <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} md={6}>
                    <KPICard
                        title="Tổng Doanh Thu"
                        value={loading ? '...' : `${totalRevenue.toLocaleString('vi-VN')} đ`}
                        percentage="↑ 12% so với tháng trước"
                        percentageType="success"
                        icon={<WalletOutlined style={{ fontSize: 16 }} />}
                        iconBgColor="rgba(255, 111, 0, 0.2)" 
                        iconColor="#FF6F00" 
                    />
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <KPICard
                        title="Tổng Đơn Hàng"
                        value={loading ? '...' : `${totalOrders}`}
                        percentage="↑ 8% so với tuần trước"
                        percentageType="success"
                        icon={<InboxOutlined style={{ fontSize: 16 }} />}
                        iconBgColor="rgba(24, 144, 255, 0.2)" 
                        iconColor="#1890ff" 
                    />
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <KPICard
                        title="Sản Phẩm Tồn Kho"
                        value={loading ? '...' : `${totalStock}`}
                        description="● Sẵn sàng giao hàng"
                        icon={<AppstoreOutlined style={{ fontSize: 16 }} />}
                        iconBgColor="rgba(82, 196, 26, 0.2)" 
                        iconColor="#52c41a"
                    />
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <KPICard
                        title="Khách Hàng Mới"
                        value={loading ? '...' : `${newUsersThisMonth}`}
                        description="● Tháng này"
                        icon={<UsergroupAddOutlined style={{ fontSize: 16 }} />}
                        iconBgColor="rgba(250, 219, 20, 0.2)" 
                        iconColor="#fadb14" 
                    />
                </Col>
            </Row>
            
            {/* ĐƠN HÀNG MỚI NHẤT (Card lớn) */}
            <Card
                title={<Title level={4} style={{ margin: 0 }}>Đơn Hàng Mới Nhất</Title>}
                extra={<Button type="text" icon={<EyeOutlined />} >Xem tất cả</Button>} 
                style={{ borderRadius: 10 }}
            >
                <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>5 đơn hàng gần đây</Text>
                
                {/* Header của bảng */}
                <Row style={customStyles.tableHeader}>
                    <Col span={6}><Text strong>Mã Đơn</Text></Col>
                    <Col span={6}><Text strong>Khách Hàng</Text></Col>
                    <Col span={6}><Text strong>Trạng Thái</Text></Col>
                    <Col span={6}><Text strong>Tổng Tiền</Text></Col>
                </Row>

                {renderLatestOrders()}
            </Card>
        </>
    );
};

export default DashboardOverview;