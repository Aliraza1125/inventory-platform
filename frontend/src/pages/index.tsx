import { Provider as StoreProvider } from 'react-redux';
import { store } from '@/redux/store';
import AppRoutes from './AppRoutes';

function App() {
  return (
    <StoreProvider store={store}>
      <AppRoutes />
    </StoreProvider>
  );
}

export default App;
