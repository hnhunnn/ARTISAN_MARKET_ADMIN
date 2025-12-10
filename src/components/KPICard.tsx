import React from 'react';
import { Card, Row, Col, Typography } from 'antd';

const { Title, Text } = Typography;

interface KPICardProps {
  title: string;
  value: string;
  percentage?: string;
  percentageType?: 'success' | 'danger' | 'warning';
  icon: React.ReactNode;
  iconBgColor: string;
  iconColor: string;
  description?: string;
}

/**
 * Component hiển thị chỉ số KPI với icon và màu sắc tùy chỉnh.
 */
const KPICard: React.FC<KPICardProps> = ({ 
  title, 
  value, 
  percentage, 
  percentageType = 'success', 
  icon, 
  iconBgColor, 
  iconColor, 
  description 
}) => (
  <Card style={{ borderRadius: 10, minHeight: 120, overflow: 'hidden' }}>
    <Row align="middle" justify="space-between" style={{ marginBottom: 8 }}>
      <Col>
        <Text type="secondary" style={{ fontSize: 13 }}>{title}</Text>
      </Col>
      <Col>
        <div style={{
          padding: 8,
          borderRadius: '50%',
          backgroundColor: iconBgColor,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          color: iconColor,
        }}>
          {icon}
        </div>
      </Col>
    </Row>
    <Title level={2} style={{ margin: 0, color: '#333' }}>
      {value}
    </Title>
    {percentage && (
      <Text type={percentageType} style={{ fontSize: 12 }}>
        {percentage}
      </Text>
    )}
    {description && (
      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
        {description}
      </Text>
    )}
  </Card>
);

export default KPICard;