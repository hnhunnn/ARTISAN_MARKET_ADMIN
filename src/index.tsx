// index.tsx (hoặc file entry point của bạn)

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; 
// Import FirebaseProvider mới
import FirebaseProvider from './context/FirebaseContext'; 

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    {/* BỌC ỨNG DỤNG BẰNG FIREBASEPROVIDER */}
    <FirebaseProvider>
      <App /> 
    </FirebaseProvider>
  </React.StrictMode>
);