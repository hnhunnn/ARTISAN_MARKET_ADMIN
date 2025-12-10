import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Button, Spin, Tag, Space, Modal, message, Form, Input, Select } from 'antd';
import { UsergroupAddOutlined, UserAddOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { createUserWithEmailAndPassword, Auth } from 'firebase/auth'; // Import Auth functions
import { collection, onSnapshot, query, Firestore, DocumentData, deleteDoc, doc, QuerySnapshot, DocumentSnapshot, setDoc, Timestamp } from 'firebase/firestore'; 

import { useFirebase } from '../context/FirebaseContext';

const { Title, Text } = Typography;
const { confirm } = Modal;
const { Option } = Select;

// Định nghĩa kiểu dữ liệu cho Người dùng
interface User {
    id: string;
    name: string; 
    email: string;
    joinedDate: string; 
}

// Định nghĩa kiểu dữ liệu cho Form Thêm Người Dùng
interface AddUserFormValues {
    hoTen: string;
    email: string;
    password: string;
}

// Style cho các phần tử bảng (giữ nguyên)
// ... (customStyles)
const customStyles = {
    tableHeader: {
        padding: '12px 0',
        borderBottom: '1px solid #f0f0f0',
        marginBottom: 16,
        color: '#555',
        display: 'flex', 
    },
    tableRow: {
        padding: '12px 0',
        borderBottom: '1px dotted #f0f0f0',
        alignItems: 'center',
        display: 'flex',
    },
    emptyTable: {
        textAlign: 'center' as 'center', 
        padding: 50,
        color: '#999',
    },
    col: {
        padding: '0 8px',
    }
};

const UserManagement: React.FC = () => {
    // Lấy db và auth từ Firebase Context
    const { db, auth, isAuthReady } = useFirebase(); 
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    
    // State cho Modal
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isAddingUser, setIsAddingUser] = useState(false);
    const [form] = Form.useForm<AddUserFormValues>();

    // --- HÀM TƯƠNG TÁC FIRESTORE ---

    // 1. Lấy dữ liệu người dùng (Giữ nguyên)
    useEffect(() => {
        if (!isAuthReady || !db) {
            if (!isAuthReady) setLoading(true); 
            return;
        }

        setLoading(true);
        const usersCollectionRef = collection(db as Firestore, `users`);
        const q = query(usersCollectionRef);

        const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
            const usersData: User[] = [];
            snapshot.forEach((doc: DocumentSnapshot<DocumentData>) => {
                const data = doc.data() as DocumentData;
                
                const joinedDate = data.createdAt?.toDate ? 
                    data.createdAt.toDate().toLocaleDateString('vi-VN') : 
                    (typeof data.createdAt === 'string' ? data.createdAt : 'N/A');

                usersData.push({
                    id: doc.id,
                    name: data.hoTen || 'Người Dùng Ẩn Danh', 
                    email: data.email || 'N/A',
                    joinedDate: joinedDate,
                });
            });
            setUsers(usersData);
            setLoading(false);
        }, (error: unknown) => { 
            console.error("Lỗi khi lấy dữ liệu người dùng:", error);
            setLoading(false);
            message.error('Không thể tải dữ liệu người dùng.');
        });

        return () => unsubscribe();
    }, [db, isAuthReady]); 

    // 2. Xóa Người Dùng (Giữ nguyên)
    const handleDeleteUser = (userId: string) => {
        // ... (Giữ nguyên)
    };

    // 3. Cập nhật Vai Trò (Giả lập) (Giữ nguyên)
    const handleEditRole = (user: User) => {
        // ... (Giữ nguyên)
    };

    // --- LOGIC THÊM NGƯỜI DÙNG ---

    const handleAddUser = () => {
        setIsModalVisible(true);
    };

    const handleModalCancel = () => {
        setIsModalVisible(false);
        form.resetFields();
    };

    const handleModalOk = async (values: AddUserFormValues) => {
        if (!auth || !db) {
            message.error("Firebase Auth hoặc Database chưa sẵn sàng.");
            return;
        }

        setIsAddingUser(true);

        try {
            // A. TẠO TÀI KHOẢN TRONG FIREBASE AUTH
            const userCredential = await createUserWithEmailAndPassword(
                auth as Auth,
                values.email,
                values.password
            );
            const userAuthId = userCredential.user.uid;

            // B. LƯU THÔNG TIN CHI TIẾT VÀO FIRESTORE
            const newUserDocRef = doc(db, `users`, userAuthId);
            
            await setDoc(newUserDocRef, {
                // Sử dụng tên trường trong Firebase: hoTen, email, createdAt
                hoTen: values.hoTen,
                email: values.email,
                createdAt: Timestamp.now(), 
                // Có thể thêm các trường khác như role, phone, v.v.
            });

            message.success(`Đã thêm người dùng ${values.hoTen} thành công!`);
            handleModalCancel();

        } catch (error: any) {
            let errorMessage = 'Lỗi không xác định khi thêm người dùng.';
            if (error.code) {
                switch (error.code) {
                    case 'auth/email-already-in-use':
                        errorMessage = 'Email đã được sử dụng. Vui lòng dùng email khác.';
                        break;
                    case 'auth/invalid-email':
                        errorMessage = 'Địa chỉ email không hợp lệ.';
                        break;
                    case 'auth/weak-password':
                        errorMessage = 'Mật khẩu phải có ít nhất 6 ký tự.';
                        break;
                    default:
                        errorMessage = `Lỗi Auth: ${error.message}`;
                }
            }
            console.error("Lỗi khi thêm người dùng:", error);
            message.error(errorMessage);
        } finally {
            setIsAddingUser(false);
        }
    };
    
    // --- RENDERING ---

    // Hàm render nội dung (Giữ nguyên)
    const renderContent = () => {
        // ... (Giữ nguyên logic renderContent)
        if (loading) {
            return (
                <div style={{ textAlign: 'center', padding: '50px' }}>
                    <Spin size="large" tip="Đang tải danh sách người dùng..." />
                </div>
            );
        }

        if (users.length === 0) {
            return (
                <div style={customStyles.emptyTable}>
                    <UsergroupAddOutlined style={{ fontSize: 48, color: '#e0e0e0', marginBottom: 16 }} />
                    <Text type="secondary">Chưa có người dùng nào</Text>
                    <Text type="secondary" style={{ display: 'block' }}>(Thêm người dùng trực tiếp vào collection "users" trong Firebase console)</Text>
                </div>
            );
        }

        return (
            <div>
                {/* Header của bảng (hiển thị lại cho bố cục mobile) */}
                <Row style={{...customStyles.tableHeader, display: 'none', marginBottom: 0}} gutter={8} className="sm:flex" align="middle">
                    <Col span={6} style={customStyles.col}><Text strong>Tên</Text></Col>
                    <Col span={6} style={customStyles.col}><Text strong>Email</Text></Col>
                    <Col span={8} style={customStyles.col}><Text strong>Ngày Tham Gia</Text></Col>
                    <Col span={4} style={customStyles.col}><Text strong>Hành Động</Text></Col>
                </Row>

                {users.map(user => (
                    <Row key={user.id} style={customStyles.tableRow} gutter={8} align="middle">
                        <Col xs={24} sm={6} style={customStyles.col}> 
                            <Text strong>{user.name}</Text>
                            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>ID: {user.id}</Text>
                        </Col>
                        <Col xs={24} sm={6} style={customStyles.col}><Text>{user.email}</Text></Col>
                        
                        <Col xs={24} sm={8} style={customStyles.col}><Text>{user.joinedDate}</Text></Col>
                        
                        <Col xs={24} sm={4} style={customStyles.col}>
                            <Space size="middle">
                                <Button 
                                    icon={<EditOutlined />} 
                                    onClick={() => handleEditRole(user)} 
                                    size="small" 
                                    title="Chỉnh sửa"
                                />
                                <Button 
                                    icon={<DeleteOutlined />} 
                                    onClick={() => handleDeleteUser(user.id)} 
                                    size="small" 
                                    danger 
                                    title="Xóa người dùng"
                                />
                            </Space>
                        </Col>
                    </Row>
                ))}
            </div>
        );
    };


    return (
        <Card 
            title={<Title level={4} style={{ margin: 0 }}>Quản Lý Người Dùng</Title>}
            // THÊM SỰ KIỆN onClick
            extra={(
                <Button 
                    type="primary" 
                    icon={<UserAddOutlined />} 
                    style={{ backgroundColor: '#FF6F00', borderColor: '#FF6F00', borderRadius: 8 }}
                    onClick={handleAddUser} // Kích hoạt Modal
                >
                    Thêm Người Dùng
                </Button>
            )}
            style={{ borderRadius: 10 }}
        >
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>Danh sách khách hàng và quản trị viên</Text>
            
            <Row style={customStyles.tableHeader} gutter={8} align="middle">
                <Col span={6} style={customStyles.col}><Text strong>Tên</Text></Col>
                <Col span={6} style={customStyles.col}><Text strong>Email</Text></Col>
                <Col span={8} style={customStyles.col}><Text strong>Ngày Tham Gia</Text></Col>
                <Col span={4} style={customStyles.col}><Text strong>Hành Động</Text></Col>
            </Row>

            {renderContent()}

            {/* MODAL THÊM NGƯỜI DÙNG */}
            <Modal
                title="Thêm Người Dùng Mới"
                open={isModalVisible}
                onCancel={handleModalCancel}
                footer={[
                    <Button key="back" onClick={handleModalCancel}>
                        Hủy
                    </Button>,
                    <Button 
                        key="submit" 
                        type="primary" 
                        loading={isAddingUser} 
                        onClick={() => form.submit()} // Gửi form khi nhấn OK
                    >
                        Thêm
                    </Button>,
                ]}
            >
                <Form
                    form={form}
                    layout="vertical"
                    name="add_user_form"
                    onFinish={handleModalOk} // Xử lý khi form hợp lệ
                >
                    <Form.Item
                        name="hoTen"
                        label="Họ và Tên"
                        rules={[{ required: true, message: 'Vui lòng nhập họ và tên!' }]}
                    >
                        <Input placeholder="Nguyễn Văn A" />
                    </Form.Item>
                    <Form.Item
                        name="email"
                        label="Email"
                        rules={[
                            { required: true, message: 'Vui lòng nhập Email!' },
                            { type: 'email', message: 'Email không đúng định dạng!' }
                        ]}
                    >
                        <Input placeholder="ví dụ: abc@gmail.com" />
                    </Form.Item>
                    <Form.Item
                        name="password"
                        label="Mật khẩu (Tối thiểu 6 ký tự)"
                        rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }, { min: 6, message: 'Mật khẩu phải tối thiểu 6 ký tự' }]}
                    >
                        <Input.Password placeholder="******" />
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    );
};

export default UserManagement;