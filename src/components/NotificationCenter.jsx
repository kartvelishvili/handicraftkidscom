import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Trash2, X } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const NotificationCenter = ({ isOpen, onClose }) => {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead,
    clearNotification,
    fetchNotifications,
    subscribeToOrders
  } = useNotifications();
  
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchNotifications();
    const unsubscribe = subscribeToOrders();
    return () => unsubscribe();
  }, []); // eslint-disable-line

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) && isOpen) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  const handleNotificationClick = (notif) => {
    if (!notif.is_read) markAsRead(notif.id);
    if (notif.order_id) {
       navigate(`/admin/orders?highlight=${notif.order_id}`);
       onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={dropdownRef}
      className="absolute right-0 top-16 w-96 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 origin-top-right"
    >
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
        <h3 className="font-heading font-bold text-gray-800 flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#57c5cf]" />
          შეტყობინებები
          {unreadCount > 0 && (
            <span className="bg-[#f292bc] text-white text-xs px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </h3>
        <div className="flex gap-2">
           {unreadCount > 0 && (
             <button 
               onClick={markAllAsRead}
               className="text-xs text-[#57c5cf] hover:text-[#4bc0cb] font-bold"
             >
               ყველას წაკითხვა
             </button>
           )}
           <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
             <X className="w-4 h-4" />
           </button>
        </div>
      </div>

      <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
        <AnimatePresence>
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
               შეტყობინებები ცარიელია
            </div>
          ) : (
            notifications.map((notif) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer relative group ${!notif.is_read ? 'bg-blue-50/50' : ''}`}
                onClick={() => handleNotificationClick(notif)}
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1">
                    <p className={`text-sm font-body ${!notif.is_read ? 'font-bold text-gray-800' : 'text-gray-600'}`}>
                      {notif.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {format(new Date(notif.created_at), 'dd MMM, HH:mm')}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     {!notif.is_read && (
                       <button 
                         onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); }}
                         className="p-1 hover:bg-gray-200 rounded-full text-[#57c5cf]"
                         title="Mark as read"
                       >
                         <Check className="w-3 h-3" />
                       </button>
                     )}
                     <button 
                       onClick={(e) => { e.stopPropagation(); clearNotification(notif.id); }}
                       className="p-1 hover:bg-gray-200 rounded-full text-red-400"
                       title="Delete"
                     >
                       <Trash2 className="w-3 h-3" />
                     </button>
                  </div>
                </div>
                {!notif.is_read && (
                   <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#57c5cf]" />
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
        <button 
            onClick={() => {
                navigate('/admin/notifications');
                onClose();
            }}
            className="text-xs text-gray-500 hover:text-gray-800 font-bold"
        >
          ყველა შეტყობინების ნახვა
        </button>
      </div>
    </div>
  );
};

export default NotificationCenter;