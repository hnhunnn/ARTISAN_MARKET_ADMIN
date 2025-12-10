// src/context/FirebaseContext.tsx

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { initializeApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth'; // ✅ IMPORT getAuth và Auth

// 1. Cấu hình Firebase (GIỮ NGUYÊN)
const firebaseConfig = {
    apiKey: "AIzaSyA6_WhhyMX178U8zqwGRcJ1VeSyj8mf8bk",
    authDomain: "artisan-market-24ef5.firebaseapp.com",
    projectId: "artisan-market-24ef5",
    storageBucket: "artisan-market-24ef5.firebasestorage.app",
    messagingSenderId: "493659443550",
    appId: "1:493659443550:web:41a93d441644a7172f3fcf",
    measurementId: "G-MBC7QV6P64"
};

// 2. Định nghĩa Context Type
interface FirebaseContextType {
    db: Firestore | null;
    auth: Auth | null; // ✅ THÊM Auth instance
    appId: string | null; 
    isAuthReady: boolean; 
}

// 3. Khởi tạo Context với giá trị mặc định
const FirebaseContext = createContext<FirebaseContextType>({
    db: null,
    auth: null, // ✅ Khởi tạo Auth mặc định là null
    appId: null,
    isAuthReady: false,
});

// 4. Hook tùy chỉnh để sử dụng Context (GIỮ NGUYÊN)
export const useFirebase = () => useContext(FirebaseContext);

// 5. Component Provider
interface FirebaseProviderProps {
    children: ReactNode;
}

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({ children }) => {
    const [db, setDb] = useState<Firestore | null>(null);
    const [auth, setAuth] = useState<Auth | null>(null); // ✅ THÊM Auth state
    const [firebaseApp, setFirebaseApp] = useState<FirebaseApp | null>(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        try {
            // Khởi tạo Firebase App
            const app = initializeApp(firebaseConfig);
            setFirebaseApp(app);
            
            // Khởi tạo Firestore
            const firestoreDb = getFirestore(app);
            setDb(firestoreDb);

            // ✅ Khởi tạo Auth
            const firebaseAuth = getAuth(app);
            setAuth(firebaseAuth);

            // Đánh dấu là đã sẵn sàng
            setIsReady(true);
            
            console.log("Firebase, Firestore, và Auth đã khởi tạo thành công.");
        } catch (error) {
            console.error("Lỗi khi khởi tạo Firebase:", error);
        }
    }, []); 

    const contextValue: FirebaseContextType = {
        db: db,
        auth: auth, // ✅ Truyền Auth instance vào Context
        appId: firebaseConfig.appId, 
        isAuthReady: isReady,
    };

    return (
        <FirebaseContext.Provider value={contextValue}>
            {children}
        </FirebaseContext.Provider>
    );
};

// Export Component Provider làm default cho dễ sử dụng
export default FirebaseProvider;