import React from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../ui/Logo';

const LogoWrapper: React.FC<{ className?: string }> = ({ className = "" }) => {
  const navigate = useNavigate();
  return (
    <div onClick={() => navigate('/')}>
      <Logo className={className} />
    </div>
  );
};

export default LogoWrapper;
