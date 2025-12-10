import React, { useState } from 'react';
import { Layout, Menu, Row, Col, Typography, Space } from 'antd';
import {
  DashboardOutlined,
  ShoppingOutlined,
  UserOutlined,
  FileTextOutlined,
  LogoutOutlined,
  BellOutlined,
  // Đã loại bỏ các Icon không cần thiết ở đây vì chúng chỉ dùng trong component con
} from '@ant-design/icons';
// Lưu ý: Bạn cần tạo file App.css (được giả định là đã có) để style cho ứng dụng
import './App.css'; 

// --- IMPORTS CÁC MÀN HÌNH CON ĐÃ TÁCH RA ---
// ✅ SỬ DỤNG LẠI CÁC FILE SCREEN ĐÃ TÁCH RA
import DashboardOverview from './screens/DashboardOverview';
import ProductManagement from './screens/ProductManagement';
import OrderManagement from './screens/OrderManagement';
import UserManagement from './screens/UserManagement';

// ❌ Đã loại bỏ import KPICard và định nghĩa customStyles, KPICard khỏi App.tsx
// ❌ Vì các screen con sẽ tự import KPICard

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

// --- 1. MAIN COMPONENT: AdminDashboard ---
const AdminDashboard: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  // State quản lý mục menu đang được chọn, mặc định là '1' (Tổng Quan)
  const [selectedMenuKey, setSelectedMenuKey] = useState('1'); 
  const [message, setMessage] = useState<string | null>(null);

  const handleLogout = () => {
    // Giả lập chức năng đăng xuất
    setMessage('Đăng xuất thành công! (Đây là thông báo giả lập)');
    setTimeout(() => setMessage(null), 3000); 
    console.log('User logged out');
  };

  // Hàm render nội dung dựa trên menu được chọn
  const renderContent = () => {
    // ✅ TRẢ VỀ CÁC COMPONENT SCREEN ĐÃ ĐƯỢC TÁCH RIÊNG
    switch (selectedMenuKey) {
      case '1':
        return <DashboardOverview />;
      case '2':
        return <ProductManagement />;
      case '3':
        return <OrderManagement />;
      case '4':
        return <UserManagement />;
      default:
        return <DashboardOverview />; // Mặc định về Tổng Quan
    }
  };

  // Xác định tiêu đề cho Header dựa trên menu
  const getHeaderTitle = (key: string) => {
    switch (key) {
      case '1': return 'Tổng Quan';
      case '2': return 'Quản lý Sản Phẩm';
      case '3': return 'Quản lý Đơn Hàng';
      case '4': return 'Quản lý Người Dùng';
      case 'logout': return 'Đăng Xuất';
      default: return 'Admin Dashboard';
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      
      {/* 1. SIDEBAR (THANH ĐIỀU HƯỚNG BÊN TRÁI) */}
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={setCollapsed} 
        breakpoint="lg" 
        collapsedWidth="80" 
        style={{ 
          backgroundColor: '#fff', 
          borderRight: '1px solid #f0f0f0',
          boxShadow: '2px 0 6px rgba(0,21,41,.08)',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100, 
        }}
      >
        <div style={{ height: 32, margin: 16, display: 'flex', alignItems: 'center' }}>
          <Title level={4} style={{ color: '#FF6F00', margin: 0, opacity: collapsed ? 0 : 1, transition: 'opacity 0.2s' }}>
            ARTISAN-MARKET
          </Title>
          {/* Icon Admin Dashboard khi sidebar bị thu gọn */}
          {collapsed && <DashboardOutlined style={{ fontSize: 24, color: '#FF6F00', margin: '0 auto' }} />}
        </div>
        <Text type="secondary" style={{ marginLeft: collapsed ? 0 : 24, display: 'block', fontSize: 12, textAlign: collapsed ? 'center' : 'left' }}>
          {collapsed ? '' : 'Admin Dashboard'}
        </Text>
        
        {/* Menu Điều Hướng */}
        <Menu 
          selectedKeys={[selectedMenuKey]}
          mode="inline" 
          style={{ borderRight: 0, marginTop: 16 }}
          onSelect={({ key }) => setSelectedMenuKey(key as string)}
        >
          <Menu.Item key="1" icon={<DashboardOutlined />}>
            Tổng Quan
          </Menu.Item>
          <Menu.Item key="2" icon={<ShoppingOutlined />}>
            Sản Phẩm
          </Menu.Item>
          <Menu.Item key="3" icon={<FileTextOutlined />}>
            Đơn Hàng
          </Menu.Item>
          <Menu.Item key="4" icon={<UserOutlined />}>
            Người Dùng
          </Menu.Item>
          <Menu.Divider /> 
          <Menu.Item key="logout" icon={<LogoutOutlined />} danger onClick={handleLogout}>
            Đăng Xuất
          </Menu.Item>
        </Menu>
      </Sider>

      {/* Vùng Content Chính */}
      <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'margin-left 0.2s' }}> 
        
        {/* 2. HEADER (ĐẦU TRANG) */}
        <Header style={{ 
          padding: 0, 
          background: '#fff', 
          borderBottom: '1px solid #f0f0f0',
          position: 'sticky', 
          top: 0,
          zIndex: 99,
         }}>
          <Row justify="space-between" align="middle" style={{ padding: '0 24px' }}>
            {/* ✅ SỬ DỤNG getHeaderTitle ĐỂ HIỂN THỊ TIÊU ĐỀ THEO TAB ĐANG CHỌN */}
            <Title level={5} style={{ margin: 0 }}>
                {getHeaderTitle(selectedMenuKey)}
            </Title>
            <Space size="large">
              <BellOutlined style={{ fontSize: 20, color: '#FF6F00' }} />
              <UserOutlined style={{ fontSize: 20, color: '#555' }} />
            </Space>
          </Row>
        </Header>

        {/* 3. NỘI DUNG (DASHBOARD) */}
        <Content style={{ 
            margin: '24px 16px', 
            overflow: 'initial', 
            backgroundColor: '#FFFAFA', 
            borderRadius: 15,
        }}>
          <div style={{ padding: 24, minHeight: 360, background: '#FFFAFA', borderRadius: 15 }}>
            {renderContent()}
          </div>
        </Content>
      </Layout>

      {/* Thông báo tùy chỉnh thay thế cho alert() */}
      {message && (
        <div style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          padding: '10px 20px',
          backgroundColor: '#FF6F00',
          color: 'white',
          borderRadius: 8,
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
          zIndex: 1000,
        }}>
          {message}
        </div>
      )}
    </Layout>
  );
};

export default AdminDashboard;