import { useEffect, useMemo, useState } from 'react'
import './App.css'

type Post = { id: string; title: string; status: 'draft' | 'published'; updated: string; body: string }

const initialPosts: Post[] = [
  { id: 'assembly', title: '西电CTF 2026 Assembly', status: 'published', updated: '2026-09-23', body: '# 西电CTF 2026 Assembly\n\n记录汇编语言学习与逆向分析过程。\n\n## 通用寄存器\n\n从能看懂教程 AI 写的开始。' },
  { id: 'reverse', title: '逆向学习手记 #3 经验杂谈', status: 'published', updated: '2026-10-11', body: '# 逆向学习手记 #3 经验杂谈\n\n把遇到的问题写下来，留给下次阅读。' },
  { id: 'new', title: '未命名草稿', status: 'draft', updated: '刚刚', body: '# 未命名草稿\n\n从这里开始写……' },
]

function renderMarkdown(source: string) {
  return source
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*)$/gm, '<h1>$1</h1>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .split(/\n{2,}/).map((block) => block.startsWith('<h') ? block : `<p>${block.replace(/\n/g, '<br />')}</p>`).join('')
}

function App() {
  const [posts, setPosts] = useState<Post[]>(() => {
    const saved = localStorage.getItem('blog-studio-demo-posts')
    return saved ? JSON.parse(saved) : initialPosts
  })
  const [selectedId, setSelectedId] = useState(posts[0]?.id ?? '')
  const [query, setQuery] = useState('')
  const [preview, setPreview] = useState(true)
  const selected = posts.find((post) => post.id === selectedId) ?? posts[0]
  const filtered = useMemo(() => posts.filter((post) => post.title.toLowerCase().includes(query.toLowerCase())), [posts, query])

  useEffect(() => { localStorage.setItem('blog-studio-demo-posts', JSON.stringify(posts)) }, [posts])

  const updateBody = (body: string) => setPosts((items) => items.map((post) => post.id === selected?.id ? { ...post, body, updated: '刚刚' } : post))
  const newPost = () => {
    const post: Post = { id: `draft-${Date.now()}`, title: '未命名草稿', status: 'draft', updated: '刚刚', body: '# 未命名草稿\n\n' }
    setPosts((items) => [post, ...items]); setSelectedId(post.id)
  }

  return <div className="studio-shell">
    <header className="studio-header">
      <div className="studio-brand"><span className="studio-mark">B</span><div><strong>Blog Studio</strong><small>离线优先写作台</small></div></div>
      <div className="sync-state"><span className="offline-dot" />离线模式 <button onClick={() => alert('同步功能将在 GitHub 连接模块中启用')}>连接 GitHub</button></div>
    </header>
    <div className="studio-body">
      <aside className="post-sidebar">
        <div className="sidebar-top"><span>文章</span><button className="new-button" onClick={newPost}>＋ 新建</button></div>
        <input className="post-filter" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索文章…" />
        <div className="post-count">{filtered.length} / {posts.length} 篇</div>
        <div className="post-items">{filtered.map((post) => <button key={post.id} className={`post-item ${post.id === selected?.id ? 'selected' : ''}`} onClick={() => setSelectedId(post.id)}><span className="post-item-title">{post.title}</span><span><i className={post.status} />{post.updated}</span></button>)}</div>
      </aside>
      <main className="editor-area">
        <div className="editor-toolbar"><div><span className="crumb">本地仓库 / posts /</span><strong>{selected?.title}</strong></div><div className="toolbar-actions"><span className="saved">● 已保存在本地</span><button onClick={() => setPreview(!preview)}>{preview ? '隐藏预览' : '显示预览'}</button><button className="publish" onClick={() => alert('已保存本地修改；联网后可在这里选择提交并推送')}>选择上传</button></div></div>
        <div className={`workbench ${preview ? '' : 'single'}`}>
          <textarea className="markdown-editor" value={selected?.body ?? ''} onChange={(event) => updateBody(event.target.value)} spellCheck={false} aria-label="Markdown 编辑器" />
          {preview && <article className="markdown-preview" dangerouslySetInnerHTML={{ __html: renderMarkdown(selected?.body ?? '') }} />}
        </div>
      </main>
    </div>
    <footer className="studio-footer"><span>本地数据保存在浏览器 LocalStorage（原型阶段）</span><span>Git / GitHub 同步：即将接入</span></footer>
  </div>
}

export default App
