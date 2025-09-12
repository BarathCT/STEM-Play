import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { authFetch } from '@/utils/auth';
import { BookOpenText, Loader2 } from 'lucide-react';

export default function StudentBlogs() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        // Gets published blogs for the student
        const res = await authFetch('/student/blogs');
        if (!alive) return;
        setBlogs(res.blogs || []);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || 'Failed to load blogs');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <BookOpenText className="w-5 h-5 text-blue-600" />
        <h1 className="text-2xl font-semibold">Blogs</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-600 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading blogs…
        </div>
      ) : err ? (
        <div className="text-center py-16 text-red-600">{err}</div>
      ) : blogs.length === 0 ? (
        <div className="text-center py-16 text-gray-500">No blogs available yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {blogs.map((b) => (
            <Link
              to={`/student/blogs/${b.id}`}
              key={b.id}
              className="group border rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
            >
              <div className="text-xs text-gray-500 mb-1">{b.subject}</div>
              <h2 className="text-base font-semibold text-gray-900 group-hover:text-blue-700">
                {b.title}
              </h2>
              {b.summary ? (
                <p className="text-sm text-gray-600 mt-1 line-clamp-3">{b.summary}</p>
              ) : null}
              <div className="mt-3 text-[11px] text-gray-500">
                {b.published ? 'Published' : 'Draft'}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}