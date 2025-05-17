'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TeacherDashboardPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/teacher/dashboard/overview');
  }, [router]);

  return null; // Or a loading spinner
}
