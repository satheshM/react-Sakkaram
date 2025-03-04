// // src/api/auth.js

// const API_BASE_URL =
//   import.meta.env.VITE_API_BASE_URL ||
//   'https://vitejsviteekarxa6n-cewr--5000--31ca1d38.local-credentialless.webcontainer.io/api';

// const request = async (endpoint, method, body) => {
//   try {
//     console.log('API Base URL:', API_BASE_URL);
//     console.log('Request:', method, endpoint, body);

//     // For demo purposes, simulate API responses
//     if (endpoint === '/login') {
//       // Simulate login
//       if (body.email && body.password) {
//         // Determine role based on email (for demo)
//         const role = body.email.includes('owner') ? 'vehicle_owner' : 'farmer';

//         return {
//           id: '123456',
//           email: body.email,
//           role: role,
//           name: role === 'farmer' ? 'Demo Farmer' : 'Demo Owner',
//           token: 'demo-token-' + Math.random().toString(36).substring(2),
//         };
//       }
//       throw new Error('Invalid credentials');
//     }

//     if (endpoint === '/signup') {
//       console.log('inside signup');
//       // Simulate registration
//       if (body.email && body.password) {
//         return {
//           id: '123456',
//           email: body.email,
//           role: body.role || 'farmer',
//           name: body.role === 'farmer' ? 'New Farmer' : 'New Owner',
//           token: 'demo-token-' + Math.random().toString(36).substring(2),
//         };
//       }
//       throw new Error('Invalid registration data');
//     }

//     // If we need to make actual API calls, uncomment this code
//     /*
//     const response = await fetch(`${API_BASE_URL}${endpoint}`, {
//       method,
//       headers: {
//         'Content-Type': 'application/json',
//         // Add auth token if available
//         ...(localStorage.getItem('user') && {
//           'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user')).token}`
//         })
//       },
//       body: body ? JSON.stringify(body) : null,
//     });

//     if (!response.ok) {
//       throw new Error(`HTTP Error: ${response.status}`);
//     }

//     return await response.json();
//     */
//   } catch (error) {
//     console.error(`API Request Failed [${method} ${endpoint}]:`, error);
//     return null;
//   }
// };

// export const loginUser = (email, password) =>
//   request('/login', 'POST', { email, password });

// export const registerUser = (email, password, role) =>
//   request('/signup', 'POST', { email, password, role });

// export const logoutUser = () => {
//   console.log('User logged out');
// };

// src/apis/auth.js

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'https://vitejsviteekarxa6n-cewr--5000--31ca1d38.local-credentialless.webcontainer.io/api'; // ✅ Use environment variables

const request = async (endpoint, method, body) => {
  try {
    console.log('API Base URL:', API_BASE_URL);

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : null,
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API Request Failed [${method} ${endpoint}]:`, error);
    return null;
  }
};

export const loginUser = (email, password) =>
  request('/login', 'POST', { email, password });

export const registerUser = (email, password, role) =>
  request('/signup', 'POST', { email, password, role });

export const logoutUser = async () => request('/logout', 'POST');
// export const profile = async () => request('/profile', 'GET');
