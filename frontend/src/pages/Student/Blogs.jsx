import { useEffect, useState } from 'react';
import { authFetch } from '../../utils/auth';
import { BookOpenText } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function StudentBlogs() {
  const [blogs, setBlogs] = useState([]);
  const [klass, setKlass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const res = await authFetch('/student/blogs');
        if (mounted) {
          setBlogs(res.blogs || []);
          setKlass(res.class || null);
        }
      } catch (e) {
        setErr(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold">Class Blogs</h1>
        {klass && <div className="text-sm text-gray-600">Class: <span className="font-medium">{klass.label}</span></div>}
      </div>

      <div className="bg-white border rounded-lg p-4">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : err ? (
          <div className="text-red-600 text-sm">{err}</div>
        ) : blogs.length === 0 ? (
          <div className="text-gray-500 text-sm">No blogs yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {blogs.map((b) => (
              <Link key={b.id} to={`/student/blogs/${b.id}`} className="border rounded-lg p-3 bg-white hover:bg-gray-50">
                <div className="text-xs text-gray-500 mb-1">{b.subject}</div>
                <div className="text-base font-semibold text-gray-900">{b.title}</div>
                <div className="text-sm text-gray-600 line-clamp-3 mt-1">{b.summary || ''}</div>
                <div className="mt-3 text-xs text-gray-500 inline-flex items-center gap-1">
                  <BookOpenText className="w-4 h-4 text-blue-600" />
                  Read more
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}