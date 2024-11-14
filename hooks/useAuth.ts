import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {jwtDecode} from 'jwt-decode';

// Define an interface for the token payload structure
interface DecodedToken {
  exp?: number;
}

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('jwtToken');

    if (token) {
      try {
        const decoded: DecodedToken = jwtDecode(token);
        const isTokenValid = decoded.exp ? decoded.exp * 1000 > Date.now() : false;

        if (isTokenValid) {
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('jwtToken');
          setIsAuthenticated(false);
          router.push('/login'); // Redirect to login page if token is expired
        }
      } catch (error) {
        console.error('Token verification failed', error);
        setIsAuthenticated(false);
        router.push('/login');
      }
    } else {
      setIsAuthenticated(false);
      router.push('/login');
    }
  }, [router]);

  return isAuthenticated;
}
