import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEmpresa } from '../../context/EmpresaContext';
import { useAuth }   from '../../context/AuthContext';
import { PaymentAlert }      from '../Common/PaymentAlert';
import OnboardingChecklist   from '../Common/OnboardingChecklist';
import { useTenantStatus } from '../../context/TenantStatusContext';
import { ClientesList }    from '../Clientes';
import { ProveedoresList } from '../Proveedores';
import { CategoriasList }  from '../Categorias';
import { EmpleadosList }   from '../Empleados';
import { ProductosList }   from '../Productos';
import { ComprasList }     from '../Compras';
import { InventarioList }  from '../Inventario';
import POS                 from '../POS';
import { FacturacionList }   from '../Facturacion';
import ConfiguracionModule   from '../Configuracion';
import ReportesModule        from '../Reportes';
import DashboardModule           from '../Dashboard';
import { NotificacionesBell }   from '../Common/NotificacionesBell';
import {
  Menu, Home, ShoppingCart, Users, Package, TruckIcon,
  DollarSign, FileText, BarChart3, Settings, LogOut,
  ChevronLeft, ChevronRight, Bell, Search, Calculator,
  Layers, Tag, AlertCircle, TrendingUp, Clock, Box,
  Receipt, Wallet, Archive, UserCheck
} from 'lucide-react';

/**
 * MainMenu - Dashboard Principal del Sistema ERP
 * Módulos: POS, Clientes, Proveedores, Inventario, Compras, Costeo, Reportes
 */

// Variantes para el stagger de tarjetas en el dashboard
const gridVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};
const cardVariants = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } },
};

// Componente para cada tarjeta de estadísticas
const StatCard = ({ stat, styles }) => {
  const [isHovered, setIsHovered] = useState(false);
  const Icon = stat.icon;

  return (
    <motion.div
      variants={cardVariants}
      style={{
        ...styles.statCard,
        ...(isHovered ? styles.statCardHover : {})
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={styles.statHeader}>
        <div
          style={{
            ...styles.statIconWrapper,
            background: stat.bgColor,
            transform: isHovered ? 'scale(1.1) rotate(5deg)' : 'scale(1)'
          }}
        >
          <Icon size={28} color={stat.color} />
        </div>
        <div
          style={{
            ...styles.statChange,
            background: stat.trend === 'warning'
              ? 'rgba(245, 158, 11, 0.15)'
              : 'rgba(16, 185, 129, 0.15)',
            color: stat.trend === 'warning' ? '#f59e0b' : '#10b981'
          }}
        >
          {stat.trend === 'warning' ? <AlertCircle size={14} /> : <TrendingUp size={14} />}
          {stat.change}
        </div>
      </div>
      <div style={styles.statValue}>{stat.value}</div>
      <div style={styles.statLabel}>{stat.title}</div>
      <div style={styles.statDescription}>{stat.description}</div>
    </motion.div>
  );
};

// Componente para cada tarjeta de módulo
const ModuleCard = ({ module, styles, handleNavigation }) => {
  const [isHovered, setIsHovered] = useState(false);
  const Icon = module.icon;

  return (
    <motion.div
      variants={cardVariants}
      style={{
        ...styles.moduleCard,
        ...(isHovered ? styles.moduleCardHover : {})
      }}
      onClick={() => handleNavigation(module.route)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        style={{
          ...styles.moduleIconWrapper,
          background: isHovered ? module.bgGradient : module.bgGradient.replace('100%', '70%'),
          transform: isHovered ? 'scale(1.1) rotate(-5deg)' : 'scale(1)',
          boxShadow: isHovered ? `0 12px 24px ${module.color}40` : 'none'
        }}
      >
        <Icon size={32} color="white" />
      </div>
      <div style={styles.moduleTitle}>{module.title}</div>
      <div style={styles.moduleDescription}>{module.description}</div>
      <div style={styles.moduleStats}>{module.stats}</div>
    </motion.div>
  );
};

const MainMenu = () => {
  const navigate    = useNavigate();
  const location    = useLocation();
  const { empresa } = useEmpresa();
  const { user: authUser, logout: authLogout } = useAuth();
  const { isReadOnly, alertType } = useTenantStatus();

  // Adaptar el usuario de AuthContext al formato que usa el componente
  const user = {
    name:  authUser?.nombre  ?? 'Usuario',
    role:  authUser?.rol     ?? 'user',
    email: authUser?.username ?? '',
  };
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');

  // Sincronizar activeSection con la ruta actual
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/clientes')) {
      setActiveSection('customers');
    } else if (path.includes('/proveedores')) {
      setActiveSection('suppliers');
    } else if (path.includes('/categorias')) {
      setActiveSection('categories');
    } else if (path.includes('/empleados')) {
      setActiveSection('employees');
    } else if (path.includes('/pos')) {
      setActiveSection('pos');
    } else if (path.includes('/productos')) {
      setActiveSection('products');
    } else if (path.includes('/inventario')) {
      setActiveSection('inventory');
    } else if (path.includes('/compras')) {
      setActiveSection('purchases');
    } else if (path.includes('/costeo')) {
      setActiveSection('costing');
    } else if (path.includes('/facturacion')) {
      setActiveSection('invoicing');
    } else if (path.includes('/reportes')) {
      setActiveSection('reports');
    } else if (path.includes('/configuracion')) {
      setActiveSection('settings');
    } else {
      setActiveSection('dashboard');
    }
  }, [location.pathname]);

  // Menú lateral con todos los módulos del sistema
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, route: '/dashboard' },
    { 
      id: 'pos', 
      label: 'Punto de Venta', 
      icon: ShoppingCart, 
      route: '/pos',
      badge: 'POS'
    },
    { 
      id: 'customers', 
      label: 'Clientes', 
      icon: Users, 
      route: '/clientes' 
    },
    {
      id: 'suppliers',
      label: 'Proveedores',
      icon: TruckIcon,
      route: '/proveedores'
    },
    {
      id: 'categories',
      label: 'Categorías',
      icon: Tag,
      route: '/categorias',
    },
    {
      id: 'employees',
      label: 'Empleados',
      icon: UserCheck,
      route: '/empleados',
    },
    {
      id: 'products',
      label: 'Productos',
      icon: Package,
      route: '/productos'
    },
    { 
      id: 'inventory', 
      label: 'Inventario', 
      icon: Box, 
      route: '/inventario',
      submenu: [
        { label: 'Stock Actual', route: '/inventario/stock' },
        { label: 'Kardex', route: '/inventario/kardex' },
        { label: 'Ajustes', route: '/inventario/ajustes' }
      ]
    },
    { 
      id: 'purchases', 
      label: 'Compras', 
      icon: Receipt, 
      route: '/compras' 
    },
    { 
      id: 'costing', 
      label: 'Costeo', 
      icon: Calculator, 
      route: '/costeo',
      description: 'Fletes, aranceles, costos finales'
    },
    { 
      id: 'invoicing', 
      label: 'Facturación', 
      icon: FileText, 
      route: '/facturacion',
      badge: 'MH'
    },
    { 
      id: 'reports', 
      label: 'Reportes', 
      icon: BarChart3, 
      route: '/reportes' 
    },
    { 
      id: 'settings', 
      label: 'Configuración', 
      icon: Settings, 
      route: '/configuracion',
      roles: ['admin'] // Solo admin
    },
  ];

  // Estadísticas del dashboard
  const stats = [
    {
      title: 'Ventas del Día',
      value: '$3,245.80',
      change: '+12.5%',
      trend: 'up',
      icon: DollarSign,
      color: '#10b981',
      bgColor: 'rgba(16, 185, 129, 0.1)',
      description: '23 transacciones hoy'
    },
    {
      title: 'Inventario Total',
      value: '1,234',
      change: '+5.2%',
      trend: 'up',
      icon: Box,
      color: '#3b82f6',
      bgColor: 'rgba(59, 130, 246, 0.1)',
      description: 'Unidades en stock'
    },
    {
      title: 'Por Vencer',
      value: '45',
      change: '-3 días',
      trend: 'warning',
      icon: AlertCircle,
      color: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.1)',
      description: 'Productos próximos a vencer'
    },
    {
      title: 'Facturas Pendientes',
      value: '12',
      change: '+4',
      trend: 'neutral',
      icon: FileText,
      color: '#8b5cf6',
      bgColor: 'rgba(139, 92, 246, 0.1)',
      description: 'Pendientes de envío MH'
    }
  ];

  // Módulos destacados (cards grandes)
  const quickAccessModules = [
    {
      id: 'pos',
      title: 'Punto de Venta',
      description: 'Registrar ventas y generar facturas',
      icon: ShoppingCart,
      color: '#10b981',
      bgGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      route: '/pos',
      stats: '23 ventas hoy'
    },
    {
      id: 'inventory',
      title: 'Inventario',
      description: 'Control de stock y kardex',
      icon: Box,
      color: '#3b82f6',
      bgGradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      route: '/inventario',
      stats: '1,234 productos'
    },
    {
      id: 'purchases',
      title: 'Compras',
      description: 'Órdenes de compra y recepciones',
      icon: Receipt,
      color: '#8b5cf6',
      bgGradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      route: '/compras',
      stats: '8 pendientes'
    },
    {
      id: 'costing',
      title: 'Costeo de Productos',
      description: 'Fletes, aranceles y costos finales',
      icon: Calculator,
      color: '#f59e0b',
      bgGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      route: '/costeo',
      stats: '5 en proceso'
    },
    {
      id: 'customers',
      title: 'Clientes',
      description: 'Gestión de clientes y cuentas',
      icon: Users,
      color: '#06b6d4',
      bgGradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
      route: '/clientes',
      stats: '234 registrados'
    },
    {
      id: 'invoicing',
      title: 'Facturación Electrónica',
      description: 'Generar y enviar DTE a Hacienda',
      icon: FileText,
      color: '#ec4899',
      bgGradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
      route: '/facturacion',
      stats: '12 pendientes'
    }
  ];

  // Actividad reciente
  const recentActivity = [
    { 
      text: 'Nueva venta #1234 completada', 
      time: 'Hace 5 min', 
      icon: ShoppingCart,
      type: 'success'
    },
    { 
      text: 'Compra #5678 recibida y costeada', 
      time: 'Hace 15 min', 
      icon: Receipt,
      type: 'info'
    },
    { 
      text: 'Factura #DTE-001234 enviada a MH', 
      time: 'Hace 30 min', 
      icon: FileText,
      type: 'success'
    },
    { 
      text: 'Alerta: 15 productos por debajo de stock mínimo', 
      time: 'Hace 1 hora', 
      icon: AlertCircle,
      type: 'warning'
    },
  ];

  const styles = {
    container: {
      display: 'flex',
      minHeight: '100vh',
      background: 'var(--page-bg, #f5f5f5)',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      position: 'relative'
    },
    backgroundPattern: {
      display: 'none'
    },
    sidebar: {
      width: sidebarCollapsed ? '80px' : '280px',
      background: 'var(--sidebar-bg, #ffffff)',
      borderRight: '1px solid #e5e5e5',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      zIndex: 10,
      boxShadow: '2px 0 8px rgba(0, 0, 0, 0.04)',
      overflowY: 'auto',
      overflowX: 'hidden'
    },
    sidebarHeader: {
      padding: '28px 24px',
      borderBottom: '1px solid var(--border-light, #f0f0f0)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: sidebarCollapsed ? 'center' : 'space-between'
    },
    logo: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      color: 'var(--text-primary, #111111)',
      fontSize: '14px',
      fontWeight: '600',
      letterSpacing: '-0.2px'
    },
    logoIcon: {
      width: '42px',
      height: '42px',
      background: 'var(--accent, #111111)',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    menuList: {
      flex: 1,
      padding: '20px 0',
      overflowY: 'auto'
    },
    menuItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      padding: sidebarCollapsed ? '14px 0' : '14px 20px',
      margin: '4px 16px',
      borderRadius: '12px',
      color: 'var(--text-muted, #6b6b6b)',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
      fontSize: '14px',
      fontWeight: '500',
      position: 'relative'
    },
    menuItemActive: {
      background: 'var(--accent, #111111)',
      color: 'var(--accent-text, #ffffff)',
      fontWeight: '600'
    },
    badge: {
      position: 'absolute',
      right: '20px',
      padding: '2px 8px',
      background: 'var(--input-bg, #f0f0f0)',
      borderRadius: '6px',
      fontSize: '10px',
      fontWeight: '700',
      color: 'var(--text-secondary, #444444)'
    },
    collapseButton: {
      position: 'absolute',
      top: '32px',
      right: '-14px',
      width: '28px',
      height: '28px',
      background: 'var(--card-bg, #ffffff)',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
      zIndex: 10,
      transition: 'all 0.2s ease',
      border: '1px solid var(--border, #e5e5e5)'
    },
    mainContent: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative',
      zIndex: 1
    },
    header: {
      height: '72px',
      background: 'var(--card-bg, #ffffff)',
      borderBottom: '1px solid var(--border, #e5e5e5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 36px',
      gap: '24px',
      boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)'
    },
    headerLeft: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      gap: '24px'
    },
    headerTitle: {
      fontSize: '22px',
      fontWeight: '700',
      color: 'var(--text-primary, #111111)',
      letterSpacing: '-0.5px',
      whiteSpace: 'nowrap'
    },
    searchBar: {
      flex: 1,
      maxWidth: '380px',
      position: 'relative'
    },
    searchInput: {
      width: '100%',
      padding: '10px 16px 10px 42px',
      background: 'var(--input-bg, #f5f5f5)',
      border: '1px solid var(--border, #e5e5e5)',
      borderRadius: '10px',
      color: 'var(--text-primary, #111111)',
      fontSize: '14px',
      outline: 'none',
      transition: 'all 0.2s ease'
    },
    searchIcon: {
      position: 'absolute',
      left: '14px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: 'var(--text-muted, #9b9b9b)'
    },
    headerRight: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    iconButton: {
      width: '40px',
      height: '40px',
      background: 'var(--input-bg, #f5f5f5)',
      border: '1px solid var(--border, #e5e5e5)',
      borderRadius: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      position: 'relative'
    },
    notificationBadge: {
      position: 'absolute',
      top: '8px',
      right: '8px',
      width: '7px',
      height: '7px',
      background: '#ef4444',
      borderRadius: '50%',
      border: '1.5px solid #ffffff'
    },
    userSection: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '6px 12px',
      background: 'var(--input-bg, #f5f5f5)',
      border: '1px solid var(--border, #e5e5e5)',
      borderRadius: '10px',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    },
    userInfo: {
      textAlign: 'right'
    },
    userName: {
      fontSize: '13px',
      fontWeight: '600',
      color: 'var(--text-primary, #111111)',
      marginBottom: '2px'
    },
    userRole: {
      fontSize: '11px',
      color: 'var(--text-muted, #9b9b9b)',
      textTransform: 'uppercase',
      fontWeight: '600',
      letterSpacing: '0.5px'
    },
    avatar: {
      width: '36px',
      height: '36px',
      borderRadius: '9px',
      background: 'var(--accent, #111111)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--accent-text, #ffffff)',
      fontWeight: '700',
      fontSize: '14px',
    },
    logoutButton: {
      padding: '9px 16px',
      background: 'var(--input-bg, #f5f5f5)',
      border: '1px solid var(--border, #e5e5e5)',
      borderRadius: '10px',
      color: 'var(--text-secondary, #444444)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '13px',
      fontWeight: '600',
      transition: 'all 0.2s ease'
    },
    contentArea: {
      flex: 1,
      padding: ['customers', 'suppliers', 'categories', 'employees', 'products', 'purchases', 'inventory', 'pos', 'invoicing', 'settings', 'dashboard', 'reports'].includes(activeSection) ? '0' : '36px',
      overflowY: 'auto',
      background: 'var(--page-bg, #f5f5f5)'
    },
    welcomeCard: {
      background: 'var(--accent, #111111)',
      borderRadius: '20px',
      border: 'none',
      padding: '40px 48px',
      marginBottom: '28px',
      position: 'relative',
      overflow: 'hidden'
    },
    welcomeDecoration: {
      position: 'absolute',
      top: '-40px',
      right: '-40px',
      width: '180px',
      height: '180px',
      background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)',
      borderRadius: '50%'
    },
    welcomeTitle: {
      fontSize: '32px',
      fontWeight: '800',
      color: 'var(--accent-text, #ffffff)',
      marginBottom: '10px',
      letterSpacing: '-1px',
      position: 'relative',
      zIndex: 1
    },
    welcomeText: {
      fontSize: '15px',
      color: 'var(--accent-text, #ffffff)',
      opacity: 0.65,
      lineHeight: '1.7',
      position: 'relative',
      zIndex: 1
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
      gap: '20px',
      marginBottom: '36px'
    },
    statCard: {
      background: 'var(--card-bg, #ffffff)',
      borderRadius: '16px',
      border: '1px solid var(--border, #e5e5e5)',
      padding: '24px',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
      position: 'relative',
      overflow: 'hidden'
    },
    statCardHover: {
      transform: 'translateY(-4px)',
      boxShadow: '0 12px 32px rgba(0, 0, 0, 0.08)',
      border: '1px solid #d0d0d0'
    },
    statHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '20px'
    },
    statIconWrapper: {
      width: '48px',
      height: '48px',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.3s ease'
    },
    statChange: {
      display: 'flex',
      alignItems: 'center',
      gap: '5px',
      padding: '4px 10px',
      borderRadius: '8px',
      fontSize: '12px',
      fontWeight: '600'
    },
    statValue: {
      fontSize: '30px',
      fontWeight: '800',
      color: 'var(--text-primary, #111111)',
      marginBottom: '6px',
      letterSpacing: '-1px'
    },
    statLabel: {
      fontSize: '14px',
      color: 'var(--text-secondary, #444444)',
      fontWeight: '500',
      marginBottom: '4px'
    },
    statDescription: {
      fontSize: '12px',
      color: 'var(--text-muted, #9b9b9b)',
      fontWeight: '400'
    },
    sectionTitle: {
      fontSize: '20px',
      fontWeight: '700',
      color: 'var(--text-primary, #111111)',
      marginBottom: '20px',
      letterSpacing: '-0.3px'
    },
    modulesGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '20px',
      marginBottom: '36px'
    },
    moduleCard: {
      background: 'var(--card-bg, #ffffff)',
      borderRadius: '16px',
      border: '1px solid var(--border, #e5e5e5)',
      padding: '28px',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
      position: 'relative',
      overflow: 'hidden'
    },
    moduleCardHover: {
      transform: 'translateY(-4px)',
      boxShadow: '0 12px 32px rgba(0, 0, 0, 0.08)',
      border: '1px solid #d0d0d0'
    },
    moduleIconWrapper: {
      width: '52px',
      height: '52px',
      borderRadius: '14px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '18px',
      transition: 'all 0.3s ease'
    },
    moduleTitle: {
      fontSize: '17px',
      fontWeight: '700',
      color: 'var(--text-primary, #111111)',
      marginBottom: '6px',
      letterSpacing: '-0.3px'
    },
    moduleDescription: {
      fontSize: '13px',
      color: 'var(--text-secondary, #6b6b6b)',
      marginBottom: '14px',
      lineHeight: '1.6'
    },
    moduleStats: {
      fontSize: '12px',
      color: 'var(--text-muted, #9b9b9b)',
      fontWeight: '500'
    },
    activitySection: {
      background: 'var(--card-bg, #ffffff)',
      borderRadius: '16px',
      border: '1px solid var(--border, #e5e5e5)',
      padding: '28px',
    },
    activityList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    },
    activityItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      padding: '14px',
      background: 'var(--row-bg-alt, #f9f9f9)',
      borderRadius: '12px',
      transition: 'all 0.2s ease',
      cursor: 'pointer'
    },
    activityIcon: {
      width: '40px',
      height: '40px',
      background: 'var(--input-bg, #f0f0f0)',
      borderRadius: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    },
    activityContent: {
      flex: 1
    },
    activityText: {
      fontSize: '13px',
      fontWeight: '500',
      color: 'var(--text-primary, #111111)',
      marginBottom: '4px'
    },
    activityTime: {
      fontSize: '12px',
      color: 'var(--text-muted, #9b9b9b)',
      display: 'flex',
      alignItems: 'center',
      gap: '4px'
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .filter(Boolean)
      .join('')
      .toUpperCase()
      .substring(0, 2) || '?';
  };

  const handleLogout = async () => {
    await authLogout();
    navigate('/login', { replace: true });
  };

  const handleNavigation = (route) => {
    navigate(route);
  };

  // Filtrar menú por roles
  const filteredMenuItems = menuItems.filter(item => 
    !item.roles || item.roles.includes(user.role)
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      style={styles.container}
    >
      <div style={styles.backgroundPattern} />

      {/* Sidebar */}
      <div className="erp-sidebar" style={styles.sidebar}>
        <div
          style={styles.collapseButton}
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </div>

        <div style={styles.sidebarHeader}>
          <div style={styles.logo}>
            <div style={styles.logoIcon}>
              {empresa?.logo_url ? (
                <img
                  src={empresa.logo_url}
                  alt="Logo"
                  style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 'inherit' }}
                />
              ) : (
                <Package size={22} color="white" />
              )}
            </div>
            {!sidebarCollapsed && <span>{empresa?.nombre_negocio || 'ERP System'}</span>}
          </div>
        </div>

        <div style={styles.menuList}>
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;

            return (
              <div
                key={item.id}
                style={{
                  ...styles.menuItem,
                  ...(isActive ? styles.menuItemActive : {})
                }}
                onClick={() => {
                  setActiveSection(item.id);
                  handleNavigation(item.route);
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'var(--row-hover, #f5f5f5)';
                    e.currentTarget.style.color = 'var(--text-primary, #111111)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-muted, #6b6b6b)';
                  }
                }}
              >
                <Icon size={20} />
                {!sidebarCollapsed && (
                  <>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.badge && <span style={styles.badge}>{item.badge}</span>}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.headerTitle}>
              {filteredMenuItems.find(item => item.id === activeSection)?.label || 'Dashboard'}
            </div>

            <div style={styles.searchBar}>
              <div style={styles.searchIcon}>
                <Search size={18} />
              </div>
              <input
                type="text"
                placeholder="Buscar productos, clientes, facturas..."
                style={styles.searchInput}
                onFocus={(e) => {
                  e.target.style.background = 'var(--card-bg, #ffffff)';
                  e.target.style.borderColor = 'var(--text-muted, #b0b0b0)';
                }}
                onBlur={(e) => {
                  e.target.style.background = 'var(--input-bg, #f5f5f5)';
                  e.target.style.borderColor = 'var(--border, #e5e5e5)';
                }}
              />
            </div>
          </div>

          <div style={styles.headerRight}>
            <NotificacionesBell />

            <div
              style={styles.userSection}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--row-hover, #ebebeb)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--input-bg, #f5f5f5)'}
            >
              <div style={styles.userInfo}>
                <div style={styles.userName}>{user.name}</div>
                <div style={styles.userRole}>{user.role}</div>
              </div>
              <div style={styles.avatar}>{getInitials(user.name)}</div>
            </div>

            <button
              style={styles.logoutButton}
              onClick={handleLogout}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#fef2f2';
                e.currentTarget.style.borderColor = '#fca5a5';
                e.currentTarget.style.color = '#ef4444';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--input-bg, #f5f5f5)';
                e.currentTarget.style.borderColor = 'var(--border, #e5e5e5)';
                e.currentTarget.style.color = 'var(--text-secondary, #444444)';
              }}
            >
              <LogOut size={16} />
              Salir
            </button>
          </div>
        </div>

        {/* Alerta de pago (se muestra encima del contenido) */}
        <PaymentAlert />
        {/* Checklist de onboarding — visible hasta que el tenant complete la configuración inicial */}
        <OnboardingChecklist />

        {/* Content Area */}
        <div style={{ ...styles.contentArea, pointerEvents: isReadOnly ? 'auto' : 'auto' }}>
          {/* Módulo POS */}
          {activeSection === 'pos' && <POS />}

          {/* Módulo Facturación */}
          {activeSection === 'invoicing' && <FacturacionList />}

          {/* Módulo Clientes */}
          {activeSection === 'customers' && <ClientesList />}

          {/* Módulo Proveedores */}
          {activeSection === 'suppliers' && <ProveedoresList />}

          {/* Módulo Categorías */}
          {activeSection === 'categories' && <CategoriasList />}

          {/* Módulo Empleados */}
          {activeSection === 'employees' && <EmpleadosList />}

          {/* Módulo Productos */}
          {activeSection === 'products' && <ProductosList />}

          {/* Módulo Compras */}
          {activeSection === 'purchases' && <ComprasList />}

          {/* Módulo Inventario */}
          {activeSection === 'inventory' && <InventarioList />}

          {/* Módulo Reportes */}
          {activeSection === 'reports' && <ReportesModule />}

          {/* Módulo Configuración */}
          {activeSection === 'settings' && <ConfiguracionModule />}

          {activeSection === 'dashboard' && <DashboardModule />}
        </div>
      </div>
    </motion.div>
  );
};

export default MainMenu;