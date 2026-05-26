import { useLocation } from 'react-router-dom';
import LeftSidebar from './LeftSidebar';
import ChatPanel from './ChatPanel';
import MobileNav from './MobileNav';

const AppShell = ({ children, user }) => {
  const location = useLocation();
  const isMessages = location.pathname === '/messages' || location.pathname === '/chat';

  return (
    <div className="min-h-screen bg-black">
      <div className="hidden md:block">
        <LeftSidebar user={user} />
      </div>

      <div className="md:pl-[260px]">
        <div className="flex">
          <main className={`flex-1 w-full ${isMessages ? 'h-screen-safe overflow-hidden flex flex-col' : 'max-w-[600px] lg:max-w-[700px] xl:max-w-[700px] 2xl:max-w-[760px] min-h-screen-safe pb-[60px] sm:pb-0'} border-x border-[#2f3336] relative bg-black overflow-x-hidden`}>
            {children}
          </main>

        {!isMessages && (
          <div className="hidden xl:block w-[380px] flex-shrink-0">
            <ChatPanel user={user} />
          </div>
        )}
        </div>
      </div>

      <MobileNav user={user} />
    </div>
  );
};

export default AppShell;
