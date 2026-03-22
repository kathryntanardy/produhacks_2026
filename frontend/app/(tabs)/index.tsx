import { useAuth } from '../../contexts/AuthContext';
import HomeScreen from '../HomeScreen';
import LinkedHomeScreen from '../LinkedHomeScreen';

export default function HomeTab() {
  const { backendUser } = useAuth();
  const hasCard = (backendUser?.credit_limit ?? 0) > 0;
  return hasCard ? <LinkedHomeScreen /> : <HomeScreen />;
}
