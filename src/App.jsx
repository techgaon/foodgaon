import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { auth, onAuthStateChanged, fullSignOut, watchDoc, watchDocLive, phoneOf } from './lib/fb.js';
import { LS } from './lib/utils.js';
import { SUPER_ADMIN } from './firebase-config.js';
import { DEFAULT_CONFIG } from './data/menu.js';
import { ToastProvider, Logo, Icon } from './ui.jsx';
import Login from './Login.jsx';
import Splash from './components/SplashScreen.jsx';
import CustomerApp from './customer/CustomerApp.jsx';
import RestaurantApp from './restaurant/RestaurantApp.jsx';
import RiderApp from './rider/RiderApp.jsx';
import AdminApp from './admin/AdminApp.jsx';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export const ROLE_INFO = {
  customer: { label: 'Order food', sub: 'Customer', icon: 'bag' },
  restaurant: { label: 'My restaurant', sub: 'Restaurant panel', icon: 'store' },
  rider: { label: 'Deliveries', sub: 'Delivery partner', icon: 'bike' },
  admin: { label: 'Admin', sub: 'Manage everything', icon: 'gear' },
};

export default function App() {
  const [user, setUser] = useState(undefined);
  const [profile, setProfile] = useState(null);
  useEffect(() => { setProfile(null); if (!user?.uid) return; return watchDoc('customers', user.uid, setProfile); }, [user?.uid]);
  const [staff, setStaff] = useState(null);
  const [staffReady, setStaffReady] = useState(false);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [role, setRoleState] = useState(() => LS.get('pp_role'));
  const [loginOpen, setLoginOpen] = useState(false);
  const [splash, setSplash] = useState(true);

  useEffect(() => { const t = setTimeout(() => setSplash(false), 2200); return () => clearTimeout(t); }, []);
  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u)), []);
  useEffect(() => watchDoc('config', 'app', (d) => d && setConfig({ ...DEFAULT_CONFIG, ...d, gstin: d.gstin || DEFAULT_CONFIG.gstin, firmAddress: d.firmAddress && d.firmAddress.length > 40 ? d.firmAddress : DEFAULT_CONFIG.firmAddress })), []);
  const phone = phoneOf(user);
  useEffect(() => {
    setStaff(null); setStaffReady(false);
    if (!phone) { setStaffReady(true); return; }
    return watchDoc('staff', phone, (d) => { setStaff(d); setStaffReady(true); });
  }, [phone]);

  // a deleted restaurant must not keep its owner panel
  const [restGone, setRestGone] = useState(false);
  useEffect(() => {
    setRestGone(false);
    if (!staff?.restaurant) return undefined;
    return watchDocLive('restaurants', staff.restaurant, (d, live) => setRestGone(!d && live));
  }, [staff?.restaurant]);

  const roles = useMemo(() => {
    // staff numbers get only their work role(s); everyone else is a customer
    const r = [];
    if (phone === SUPER_ADMIN || staff?.admin) r.push('admin');
    if (staff?.restaurant && !restGone) r.push('restaurant');
    if (staff?.rider) r.push('rider');
    if (!r.length || staff?.customer) r.push('customer');
    return r;
  }, [staff, phone, restGone]);

  const setRole = (r) => { LS.set('pp_role', r); setRoleState(r); window.scrollTo(0, 0); };
  const logout = async () => { LS.del('pp_role'); setRoleState(null); await fullSignOut(); location.reload(); };
  const activeRole = !user ? 'customer' : roles.includes(role) ? role : roles.length > 1 ? null : roles[0];

  const value = { user, profile, phone, staff, config, roles, role: activeRole, setRole, logout, askLogin: () => setLoginOpen(true) };

  let body;
  if (splash || user === undefined || (user && !staffReady)) body = <Splash />;
  else if (user && !activeRole) body = <RoleChooser roles={roles} onPick={setRole} onLogout={logout} />;
  else if (activeRole === 'admin') body = <AdminApp />;
  else if (activeRole === 'restaurant') body = <RestaurantApp />;
  else if (activeRole === 'rider') body = <RiderApp />;
  else body = <CustomerApp />;

  return (
    <Ctx.Provider value={value}>
      <ToastProvider>
        <div className="app-shell">{body}</div>
        {loginOpen && <Login onClose={() => setLoginOpen(false)} />}
        {/* signed in but no name yet (new sign up / Google without name) → ask the name first */}
        {!loginOpen && user && !splash && staffReady && !user.displayName && activeRole === 'customer' && <Login startStep="name" />}
      </ToastProvider>
    </Ctx.Provider>
  );
}

export function RoleChooser({ roles, onPick, onLogout, current }) {
  return (
    <div className="role-page">
      <div className="role-head">
        <Logo size={56} />
        <h2>Choose how you want to continue</h2>
        <p className="muted">Your number has more than one role. You can switch any time from the menu.</p>
      </div>
      <div className="role-grid">
        {roles.map((r, i) => (
          <button key={r} className={'role-card' + (current === r ? ' on' : '')} style={{ animationDelay: i * 70 + 'ms' }} onClick={() => onPick(r)}>
            <span className={'role-ic role-' + r}><Icon name={ROLE_INFO[r].icon} size={26} /></span>
            <b>{ROLE_INFO[r].label}</b>
            <small>{ROLE_INFO[r].sub}</small>
          </button>
        ))}
      </div>
      {onLogout && <button className="btn ghost block" onClick={onLogout}><Icon name="logout" size={18} /> Log out</button>}
    </div>
  );
}

/* small header menu to switch role (for staff) */
export function RoleSwitchButton() {
  const { roles, role, setRole } = useApp();
  const [open, setOpen] = useState(false);
  if (roles.length < 2) return null;
  return (
    <>
      <button className="icon-btn light" onClick={() => setOpen(true)} aria-label="Switch role"><Icon name="swap" /></button>
      {open && (
        <div className="sheet-wrap" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="sheet"><div className="sheet-grab" />
            <div className="sheet-body">
              <RoleChooser roles={roles} current={role} onPick={(r) => { setOpen(false); setRole(r); }} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
