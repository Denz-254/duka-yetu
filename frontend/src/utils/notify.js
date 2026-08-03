/** Short toast helpers — keep messages brief for the whole app */
import toast from 'react-hot-toast';

const shorten = (msg, max = 48) => {
  if (!msg) return 'Something went wrong';
  const text = typeof msg === 'string' ? msg : String(msg);
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

export const notify = {
  success: (msg) => toast.success(shorten(msg, 40)),
  error: (msg) => toast.error(shorten(msg, 48)),
  info: (msg) => toast(shorten(msg, 40)),
};

export default notify;
