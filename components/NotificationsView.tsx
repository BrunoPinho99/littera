
import React, { useState } from 'react';
import { Notification } from '../types';

interface NotificationsViewProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onAction?: (type: Notification['type']) => void;
  onClose: () => void;
}

const NotificationsView: React.FC<NotificationsViewProps> = ({ notifications, onMarkAsRead, onMarkAllAsRead, onAction, onClose }) => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const handleNotificationClick = (notification: Notification) => {
    // Marcar como lida no estado global
    onMarkAsRead(notification.id);
    
    // Executar ação de navegação enviada via props
    if (onAction) {
      onAction(notification.type);
    }
  };

  const filteredNotifications = filter === 'all' 
    ? notifications 
    : notifications.filter(n => !n.read);

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'correction': return { icon: 'assignment_turned_in', color: 'text-green-500 bg-green-100 dark:bg-green-900/30' };
      case 'ranking': return { icon: 'emoji_events', color: 'text-amber-500 bg-amber-100 dark:bg-amber-900/30' };
      case 'system': return { icon: 'info', color: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30' };
      case 'tip': return { icon: 'lightbulb', color: 'text-primary bg-violet-100 dark:bg-violet-900/30' };
      default: return { icon: 'notifications', color: 'text-gray-500 bg-gray-100' };
    }
  };

  return (
    <div className="animate-fade-in max-w-3xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notificações</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Fique por dentro das suas correções e novidades.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="flex flex-wrap gap-2">
             <button 
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === 'all' ? 'bg-primary text-white shadow-md' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600'}`}
            >
              Todas
            </button>
            <button 
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === 'unread' ? 'bg-primary text-white shadow-md' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600'}`}
            >
              Não lidas
            </button>
             <button 
              onClick={onMarkAllAsRead}
              className="ml-2 text-primary text-sm font-bold hover:underline"
            >
              Lidas (todas)
            </button>
          </div>
          
          <div className="h-8 w-px bg-gray-200 dark:bg-slate-700 mx-1 hidden md:block"></div>
          
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all shadow-sm shrink-0"
            title="Fechar Notificações"
          >
            <span className="material-icons-outlined">close</span>
          </button>
        </div>
      </header>

      <div className="space-y-4">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => {
            const style = getIcon(notification.type);
            return (
              <div 
                key={notification.id} 
                onClick={() => handleNotificationClick(notification)}
                className={`relative bg-white dark:bg-surface-dark p-5 rounded-2xl border transition-all duration-300 cursor-pointer group hover:shadow-lg active:scale-[0.98] ${notification.read ? 'border-gray-100 dark:border-slate-800 opacity-80' : 'border-primary/40 dark:border-primary/30 shadow-sm ring-1 ring-primary/5'}`}
              >
                {!notification.read && (
                  <span className="absolute top-5 right-5 w-3 h-3 bg-primary rounded-full animate-pulse border-2 border-white shadow-sm"></span>
                )}
                
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110 ${style.color}`}>
                    <span className="material-icons-outlined text-2xl">{style.icon}</span>
                  </div>
                  
                  <div className="flex-1 pr-6">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className={`font-bold text-base transition-colors ${notification.read ? 'text-gray-700 dark:text-gray-300' : 'text-primary dark:text-primary-light'}`}>
                        {notification.title}
                      </h4>
                      <span className="text-xs text-gray-400 whitespace-nowrap ml-2">{notification.timestamp}</span>
                    </div>
                    <p className={`text-sm leading-relaxed ${notification.read ? 'text-gray-500 dark:text-gray-500' : 'text-gray-700 dark:text-gray-200'}`}>
                      {notification.message}
                    </p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-4 bottom-4">
                    <span className="material-icons-outlined text-primary text-lg">arrow_forward</span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-24 flex flex-col items-center bg-gray-50 dark:bg-slate-800/20 rounded-[2.5rem] border border-dashed border-gray-200 dark:border-slate-800">
             <div className="w-20 h-20 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 text-gray-300 dark:text-slate-600">
                <span className="material-icons-outlined text-4xl">notifications_off</span>
             </div>
             <p className="text-gray-500 dark:text-gray-400 font-bold text-lg">Silêncio por aqui...</p>
             <p className="text-gray-400 text-sm">Você não tem notificações para o filtro selecionado.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsView;
