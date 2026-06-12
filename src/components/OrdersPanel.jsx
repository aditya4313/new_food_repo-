import { useCallback, useEffect, useState } from 'react';

import { API_URL } from '../util/api.js';

const ADMIN_SESSION_KEY = 'foodapp-admin-key';
const POLL_INTERVAL_MS = 15000;

function formatItems(items) {
  return items
    .map((item) => `${item.name}${item.quantity > 1 ? ` x${item.quantity}` : ''}`)
    .join(', ');
}

export default function OrdersPanel() {
  const [isAdminRoute, setIsAdminRoute] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [password, setPassword] = useState('');
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchOrders = useCallback(async (adminKey) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${API_URL}/orders?key=${encodeURIComponent(adminKey)}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch orders.');
      }

      setOrders(data);
      return true;
    } catch (fetchError) {
      setError(fetchError.message || 'Failed to fetch orders.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (!params.has('admin')) {
      return;
    }

    setIsAdminRoute(true);

    const storedKey = sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (storedKey) {
      setIsUnlocked(true);
      fetchOrders(storedKey);
    }
  }, [fetchOrders]);

  useEffect(() => {
    if (!isUnlocked) {
      return;
    }

    const storedKey = sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (!storedKey) {
      return;
    }

    const intervalId = setInterval(() => {
      fetchOrders(storedKey);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [isUnlocked, fetchOrders]);

  async function handleUnlock(event) {
    event.preventDefault();

    const success = await fetchOrders(password.trim());

    if (success) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, password.trim());
      setIsUnlocked(true);
      setPassword('');
    }
  }

  function handleLock() {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    setIsUnlocked(false);
    setOrders([]);
    setPassword('');
    setError('');
  }

  if (!isAdminRoute) {
    return null;
  }

  if (!isUnlocked) {
    return (
      <aside className="orders-panel orders-panel--login">
        <h3>Admin Orders</h3>
        <p className="orders-panel-hint">Enter the admin key to view recent orders.</p>
        <form onSubmit={handleUnlock}>
          <input
            type="password"
            placeholder="Admin key"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
          <button type="submit" disabled={!password.trim() || isLoading}>
            {isLoading ? 'Checking...' : 'Unlock'}
          </button>
        </form>
        {error && <p className="orders-panel-error">{error}</p>}
      </aside>
    );
  }

  return (
    <aside
      className={`orders-panel ${isExpanded ? 'orders-panel--expanded' : 'orders-panel--collapsed'}`}
    >
      <div className="orders-panel-header">
        <h3>Recent Orders</h3>
        <div className="orders-panel-actions">
          <button
            type="button"
            className="orders-panel-icon-btn"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-label={isExpanded ? 'Collapse orders panel' : 'Expand orders panel'}
          >
            {isExpanded ? '−' : '+'}
          </button>
          <button
            type="button"
            className="orders-panel-icon-btn"
            onClick={handleLock}
            aria-label="Lock orders panel"
          >
            Lock
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="orders-panel-body">
          {isLoading && orders.length === 0 && (
            <p className="orders-panel-empty">Loading orders...</p>
          )}

          {error && <p className="orders-panel-error">{error}</p>}

          {!isLoading && !error && orders.length === 0 && (
            <p className="orders-panel-empty">No orders yet.</p>
          )}

          <ul className="orders-panel-list">
            {orders.map((order) => (
              <li key={order.id} className="orders-panel-item">
                <strong>{order.customerName}</strong>
                <span>{formatItems(order.items)}</span>
              </li>
            ))}
          </ul>

          <p className="orders-panel-footer">Showing last 5 orders · name & items only</p>
        </div>
      )}
    </aside>
  );
}
