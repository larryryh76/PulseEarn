/** Simplify dashboard console foot to avoid duplication when rendering dashboard */
import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { PSE_DOC_ORDER, PSE_DOC_PATH, PSE_DOC_LABEL } from './pseDocs';

const ConsoleFoot: React.FC = () => {
  const location = useLocation();
  const isDashboard = location.pathname === '/mine/dashboard' || location.pathname === '/mine';

  if (isDashboard) {
    return (
      <footer className="pse-console-foot text-center py-4 text-xs text-slate-500 border-t border-slate-800/60">
        <div className="pse-console-foot-inner justify-center">
          <span>© 2026 PSEmine · PSEmine</span>
        </div>
      </footer>
    );
  }

  return (
    <footer className="pse-console-foot">
      <div className="pse-console-foot-inner">
        <span>PSEmine · 90-day mining campaign</span>
        <span className="pse-console-foot-links">
          {PSE_DOC_ORDER.map(id => (
            <Link key={id} to={PSE_DOC_PATH[id]}>{PSE_DOC_LABEL[id]}</Link>
          ))}
        </span>
      </div>
    </footer>
  );
};

export default ConsoleFoot;
