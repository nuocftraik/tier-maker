import { cookies } from 'next/headers';
import { decrypt } from '@/lib/auth';
import { Navbar } from '@/components/layout/Navbar';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');
  
  let session = null;
  if (sessionCookie?.value) {
    session = await decrypt(sessionCookie.value);
  }

  return (
    <>
      <Navbar session={session} />
      <main style={{ padding: '2rem 1rem', maxWidth: '1200px', margin: '0 auto' }}>
        {children}
      </main>
    </>
  );
}
