import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../test/utils';
import { ToastProvider, useToast } from './ToastContext';
import { renderHook } from '@testing-library/react';

function TestConsumer() {
  const toast = useToast();
  return (
    <div>
      <button onClick={() => toast.success('Success msg')}>success</button>
      <button onClick={() => toast.error('Error msg')}>error</button>
      <button onClick={() => toast.warning('Warning msg')}>warning</button>
      <button onClick={() => toast.info('Info msg')}>info</button>
    </div>
  );
}

describe('ToastContext', () => {
  it('shows a success toast', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('success'));
    expect(screen.getByText('Success msg')).toBeInTheDocument();
  });

  it('shows an error toast', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('error'));
    expect(screen.getByText('Error msg')).toBeInTheDocument();
  });

  it('shows a warning toast', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('warning'));
    expect(screen.getByText('Warning msg')).toBeInTheDocument();
  });

  it('shows an info toast', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('info'));
    expect(screen.getByText('Info msg')).toBeInTheDocument();
  });

  it('dismisses a toast when dismiss button is clicked', async () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('success'));
    expect(screen.getByText('Success msg')).toBeInTheDocument();

    const dismissBtn = screen.getByLabelText('Dismiss notification');
    fireEvent.click(dismissBtn);
    await waitFor(() => {
      expect(screen.queryByText('Success msg')).not.toBeInTheDocument();
    });
  });

  it('can show multiple toasts', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('success'));
    fireEvent.click(screen.getByText('error'));
    expect(screen.getByText('Success msg')).toBeInTheDocument();
    expect(screen.getByText('Error msg')).toBeInTheDocument();
  });

  it('throws when useToast is used outside ToastProvider', () => {
    expect(() => {
      renderHook(() => useToast());
    }).toThrow('useToast must be used within a ToastProvider');
  });
});
