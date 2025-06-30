'use client';
import Link from 'next/link';

export default function Home() {
  return (
    <div style={{ padding: 20 }}>
      <h1>Supscriptchain Frontend</h1>
      <ul>
        <li><Link href="/plans">Plan Overview</Link></li>
        <li><Link href="/manage">Subscription Management</Link></li>
        <li><Link href="/payment">Payment</Link></li>
        <li><Link href="/analytics">Analytics</Link></li>
      </ul>
    </div>
  );
}
