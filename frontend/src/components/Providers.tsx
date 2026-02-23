'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});

export default function Providers({ children }: { children: React.ReactNode }) {
    const initFromStorage = useAuthStore((state) => state.initFromStorage);

    useEffect(() => {
        initFromStorage();
    }, [initFromStorage]);

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}
