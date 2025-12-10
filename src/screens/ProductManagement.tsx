import React, { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Input,
  Form,
  Space,
  message,
  Spin,
  Popconfirm,
  Select,
  Upload,
  Tag, // Thêm Tag để hiển thị badge giảm giá
} from "antd";
import {
  ShoppingOutlined,
  NumberOutlined,
  TagOutlined,
  PictureOutlined,
  AppstoreOutlined,
  FileAddOutlined,
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  StarOutlined,
  UploadOutlined,
  PercentageOutlined, // Thêm icon phần trăm
} from "@ant-design/icons";
import {
  collection,
  onSnapshot,
  query,
  Firestore,
  DocumentData,
  deleteDoc,
  doc,
  QuerySnapshot,
  DocumentSnapshot,
  addDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";

// Import Context
import { useFirebase } from "../context/FirebaseContext";

// --- CẤU HÌNH CLOUDINARY ---
const CLOUD_NAME = "dqr2gixhz";
const UPLOAD_PRESET = "artisan_upload";
// ---------------------------

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// --- 1. ĐỊNH NGHĨA TYPES (Thêm trường discount) ---

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  discount: number; // MỚI: Phần trăm giảm giá (0-100)
  quantity: number;
  description: string;
  imageUrl: string;
  rating: number;
}

interface ProductFormValues {
  name: string;
  category: string;
  price: number;
  discount: number; // MỚI
  quantity: number;
  description: string;
  imageURL: string;
}

const categories = [
  { id: "painting", name: "Tranh vẽ", icon: "🖼️" },
  { id: "ceramics", name: "Gốm sứ", icon: "💡" },
  { id: "weaving", name: "Đan lát", icon: "🧺" },
  { id: "jewelry", name: "Trang sức", icon: "💎" },
];

// --- HÀM UPLOAD (Giữ nguyên) ---
const uploadToCloudinary = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("cloud_name", CLOUD_NAME);

  try {
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: "POST", body: formData }
    );
    const data = await res.json();
    return data.secure_url;
  } catch (error) {
    console.error("Lỗi upload:", error);
    throw error;
  }
};

// --- 2. COMPONENT FORM ---

interface ProductFormProps {
  onCancel: () => void;
  onSave: (values: ProductFormValues) => Promise<void>;
  isSaving: boolean;
  initialValues?: ProductFormValues;
  isEditMode?: boolean;
}

const ProductBaseForm: React.FC<ProductFormProps> = ({
  onCancel,
  onSave,
  isSaving,
  initialValues,
  isEditMode = false,
}) => {
  const [form] = Form.useForm<ProductFormValues>();
  const [fileList, setFileList] = useState<any[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue(initialValues);
      if (initialValues.imageURL) {
        setFileList([
          {
            uid: "-1",
            name: "Ảnh hiện tại",
            status: "done",
            url: initialValues.imageURL,
          },
        ]);
        setPreviewImage(initialValues.imageURL);
      }
    } else {
      // Mặc định discount là 0 khi tạo mới
      form.setFieldsValue({ discount: 0, category: "ceramics" });
      setFileList([]);
      setPreviewImage(null);
    }
  }, [initialValues, form]);

  const handleFileChange = ({ fileList: newFileList }: any) => {
    setFileList(newFileList);
    if (newFileList.length > 0 && newFileList[0].originFileObj) {
      setPreviewImage(URL.createObjectURL(newFileList[0].originFileObj));
    } else if (newFileList.length === 0) {
      setPreviewImage(null);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      let finalImageUrl = initialValues?.imageURL || "";

      const fileToUpload =
        fileList.length > 0 && fileList[0].originFileObj
          ? fileList[0].originFileObj
          : null;

      if (fileToUpload) {
        message.loading({ content: "Đang tải ảnh...", key: "upload" });
        try {
          finalImageUrl = await uploadToCloudinary(fileToUpload);
          message.success({ content: "Tải ảnh xong!", key: "upload" });
        } catch (error) {
          message.error({ content: "Lỗi tải ảnh!", key: "upload" });
          return;
        }
      } else if (!finalImageUrl && fileList.length === 0) {
        message.error("Vui lòng chọn ảnh!");
        return;
      }

      const finalValues = {
        ...values,
        price: Number(values.price),
        discount: Number(values.discount) || 0, // Lưu discount
        quantity: Number(values.quantity),
        imageURL: finalImageUrl,
      };

      await onSave(finalValues);
    } catch (errorInfo) {
      message.error("Vui lòng kiểm tra lại thông tin.");
    }
  };

  const titleText = isEditMode ? "Chỉnh Sửa Sản Phẩm" : "Thêm Sản Phẩm Mới";

  return (
    <Card
      title={
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={onCancel} type="text" />
          <Title level={4} style={{ margin: 0 }}>
            {titleText}
          </Title>
        </Space>
      }
      style={{ borderRadius: 12, marginTop: 20 }}
    >
      <Form form={form} layout="vertical" onFinish={handleSave}>
        <Row gutter={40}>
          {/* CỘT TRÁI */}
          <Col xs={24} md={12}>
            <Form.Item
              name="name"
              label={<Text strong>Tên Sản Phẩm</Text>}
              rules={[{ required: true }]}
            >
              <Input
                placeholder="Tên sản phẩm"
                prefix={<ShoppingOutlined />}
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="category"
              label={<Text strong>Danh Mục</Text>}
              rules={[{ required: true }]}
            >
              <Select placeholder="Chọn danh mục" size="large">
                {categories.map((cat) => (
                  <Option key={cat.id} value={cat.id}>
                    <Space>
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </Space>
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item label={<Text strong>Ảnh Sản Phẩm</Text>}>
              <Upload
                listType="picture-card"
                fileList={fileList}
                onChange={handleFileChange}
                beforeUpload={() => false}
                maxCount={1}
                accept="image/*"
              >
                {fileList.length < 1 && (
                  <div>
                    <UploadOutlined />
                    <div style={{ marginTop: 8 }}>Chọn Ảnh</div>
                  </div>
                )}
              </Upload>
              <Form.Item name="imageURL" noStyle>
                <Input type="hidden" />
              </Form.Item>
            </Form.Item>
          </Col>

          {/* CỘT PHẢI - Đã chia lại layout để thêm Discount */}
          <Col xs={24} md={12}>
            <Row gutter={16}>
              {/* Giá gốc */}
              <Col span={12}>
                <Form.Item
                  name="price"
                  label={<Text strong>Giá Gốc (đ)</Text>}
                  rules={[
                    { required: true, message: "Nhập giá!" },
                    {
                      validator: (_, v) =>
                        Number(v) < 0
                          ? Promise.reject("Không được âm!")
                          : Promise.resolve(),
                    },
                  ]}
                >
                  <Input
                    type="number"
                    min={0}
                    prefix={<TagOutlined />}
                    size="large"
                    placeholder="0"
                  />
                </Form.Item>
              </Col>

              {/* MỚI: Phần trăm giảm giá */}
              <Col span={12}>
                <Form.Item
                  name="discount"
                  label={<Text strong>Giảm Giá (%)</Text>}
                  initialValue={0}
                  rules={[
                    { required: true, message: "Nhập % giảm!" },
                    {
                      validator: (_, v) => {
                        const val = Number(v);
                        if (val < 0) return Promise.reject("Không được âm!");
                        if (val > 100) return Promise.reject("Tối đa 100%!");
                        return Promise.resolve();
                      },
                    },
                  ]}
                >
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    prefix={<PercentageOutlined />}
                    size="large"
                    placeholder="0 - 100"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="quantity"
              label={<Text strong>Số Lượng Tồn Kho</Text>}
              rules={[
                { required: true },
                {
                  validator: (_, v) =>
                    Number(v) < 0
                      ? Promise.reject("Không được âm!")
                      : Promise.resolve(),
                },
              ]}
            >
              <Input
                type="number"
                min={0}
                prefix={<NumberOutlined />}
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="description"
              label={<Text strong>Mô Tả</Text>}
              rules={[{ required: true }]}
            >
              <TextArea rows={4} />
            </Form.Item>
          </Col>
        </Row>

        <Row justify="end" style={{ marginTop: 20 }}>
          <Space>
            <Button onClick={onCancel}>Hủy</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={isSaving}
              style={{ backgroundColor: "#FF6F00", borderColor: "#FF6F00" }}
            >
              {isEditMode ? "Cập Nhật" : "Lưu Sản Phẩm"}
            </Button>
          </Space>
        </Row>
      </Form>
    </Card>
  );
};

// --- 3. COMPONENT QUẢN LÝ CHÍNH ---

const customStyles = {
  tableHeader: {
    padding: "12px 0",
    borderBottom: "2px solid #ddd",
    marginBottom: 16,
    fontWeight: "bold" as const,
    backgroundColor: "#fafafa",
    display: "flex" as const,
    alignItems: "middle",
  },
  tableRow: {
    padding: "16px 0",
    borderBottom: "1px solid #f0f0f0",
    alignItems: "top",
    display: "flex" as const,
  },
  emptyTable: { textAlign: "center" as const, padding: 50, color: "#999" },
};

const ProductManagement: React.FC = () => {
  const { db, isAuthReady } = useFirebase();
  const [viewMode, setViewMode] = useState<"list" | "add" | "edit">("list");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (!isAuthReady || !db) {
      if (!isAuthReady) setLoading(true);
      return;
    }
    setLoading(true);
    const q = query(collection(db as Firestore, `products`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Product[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          name: data.name || "Sản phẩm",
          category: data.category || "N/A",
          price: data.price || 0,
          discount: data.discount || 0, // Lấy discount từ DB
          quantity: data.quantity || 0,
          description: data.description || "",
          imageUrl: data.imageUrl || "",
          rating: data.rating || 0,
        });
      });
      setProducts(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [db, isAuthReady]);

  const handleAddProduct = async (values: ProductFormValues) => {
    if (!db) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, `products`), {
        name: values.name,
        category: values.category,
        price: Number(values.price),
        discount: Number(values.discount),
        quantity: Number(values.quantity),
        description: values.description,
        imageUrl: values.imageURL,
        rating: 0,
        createdAt: Timestamp.now(),
      });
      message.success(`Đã thêm thành công!`);
      setViewMode("list");
    } catch (e) {
      message.error("Lỗi khi thêm.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateProduct = async (values: ProductFormValues) => {
    if (!db || !editingProduct) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, `products`, editingProduct.id), {
        name: values.name,
        category: values.category,
        price: Number(values.price),
        discount: Number(values.discount),
        quantity: Number(values.quantity),
        description: values.description,
        imageUrl: values.imageURL,
      });
      message.success(`Đã cập nhật thành công!`);
      setEditingProduct(null);
      setViewMode("list");
    } catch (e) {
      message.error("Lỗi khi cập nhật.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await deleteDoc(doc(db!, `products`, id));
      message.success("Đã xóa!");
    } catch (e) {
      message.error("Lỗi xóa.");
    }
  };

  const renderProductList = () => {
    if (loading)
      return (
        <div style={customStyles.emptyTable}>
          <Spin size="large" />
        </div>
      );
    if (products.length === 0)
      return (
        <div style={customStyles.emptyTable}>
          <AppstoreOutlined style={{ fontSize: 48 }} />
          <Text>Chưa có sản phẩm</Text>
        </div>
      );

    return (
      <div>
        {products.map((p) => {
          const currentCat = categories.find((c) => c.id === p.category);
          // Tính giá sau khi giảm để hiển thị
          const discountedPrice = p.price * (1 - p.discount / 100);

          return (
            <Row
              key={p.id}
              style={customStyles.tableRow}
              gutter={16}
              align="middle"
            >
              <Col span={3}>
                <img
                  src={p.imageUrl || "https://via.placeholder.com/50"}
                  alt={p.name}
                  style={{
                    width: 60,
                    height: 60,
                    objectFit: "cover",
                    borderRadius: 6,
                  }}
                />
              </Col>
              <Col span={5}>
                <Text strong>{p.name}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  ID: {p.id.substring(0, 8)}
                </Text>
              </Col>
              <Col span={3}>{currentCat ? currentCat.name : p.category}</Col>

              {/* CỘT GIÁ (Hiển thị thông minh) */}
              <Col span={5}>
                {p.discount > 0 ? (
                  <div>
                    <Text
                      delete
                      type="secondary"
                      style={{ fontSize: 13, marginRight: 8 }}
                    >
                      {p.price.toLocaleString("vi-VN")} đ
                    </Text>
                    <Tag color="red">-{p.discount}%</Tag>
                    <br />
                    <Text strong style={{ color: "#d32f2f", fontSize: 16 }}>
                      {discountedPrice.toLocaleString("vi-VN")} đ
                    </Text>
                  </div>
                ) : (
                  <Text strong style={{ color: "#FF6F00", fontSize: 16 }}>
                    {p.price.toLocaleString("vi-VN")} đ
                  </Text>
                )}
              </Col>

              <Col span={3}>{p.quantity}</Col>
              <Col span={5}>
                <Space>
                  <Button
                    icon={<EditOutlined />}
                    size="small"
                    onClick={() => {
                      setEditingProduct(p);
                      setViewMode("edit");
                    }}
                  />
                  <Popconfirm
                    title="Xóa?"
                    onConfirm={() => handleDeleteProduct(p.id)}
                  >
                    <Button icon={<DeleteOutlined />} size="small" danger />
                  </Popconfirm>
                </Space>
              </Col>
            </Row>
          );
        })}
      </div>
    );
  };

  if (viewMode === "add")
    return (
      <ProductBaseForm
        onCancel={() => setViewMode("list")}
        onSave={handleAddProduct}
        isSaving={isSaving}
      />
    );
  if (viewMode === "edit" && editingProduct) {
    const initialFormValues = {
      name: editingProduct.name,
      category: editingProduct.category,
      price: editingProduct.price,
      discount: editingProduct.discount, // Truyền discount vào form sửa
      quantity: editingProduct.quantity,
      description: editingProduct.description,
      imageURL: editingProduct.imageUrl,
    };
    return (
      <ProductBaseForm
        onCancel={() => {
          setEditingProduct(null);
          setViewMode("list");
        }}
        onSave={handleUpdateProduct}
        isSaving={isSaving}
        initialValues={initialFormValues}
        isEditMode={true}
      />
    );
  }

  return (
    <Card
      title={<Title level={4}>Quản Lý Sản Phẩm</Title>}
      extra={
        <Button
          type="primary"
          icon={<FileAddOutlined />}
          onClick={() => setViewMode("add")}
          style={{ backgroundColor: "#FF6F00", borderColor: "#FF6F00" }}
        >
          Thêm Sản Phẩm
        </Button>
      }
    >
      <Row style={customStyles.tableHeader}>
        <Col span={3}>Ảnh</Col>
        <Col span={5}>Tên</Col>
        <Col span={3}>Danh Mục</Col>
        <Col span={5}>Giá & KM</Col>
        <Col span={3}>Kho</Col>
        <Col span={5}>Hành Động</Col>
      </Row>
      <div style={{ maxHeight: "calc(100vh - 300px)", overflowY: "auto" }}>
        {renderProductList()}
      </div>
    </Card>
  );
};

export default ProductManagement;
