// Upload.tsx — /uploadへの直接アクセスをanalysisにリダイレクト
import { useEffect } from 'react';
import { useLocation } from 'wouter';
export default function Upload() {
  const [, navigate] = useLocation();
  useEffect(() => { navigate('/analysis', { replace: true }); }, []);
  return null;
}
