import { useEffect, useMemo, useState } from 'react'
import './App.css'

type Post = { id: string; title: string; status: 'draft' | 'published'; updated: string; body: string; path?: string; fileHandle?: any }

type DirectoryHandle = any

const initialPosts: Post[] = [
  { id: 'assembly', title: '西电CTF 2026 Assembly', status: 'published', updated: '2026-09-23', body: '# 西电CTF 2026 Assembly\n\n记录汇编语言学习与逆向分析过程。\n\n## 通用寄存器\n\n从能看懂教程 AI 写的开始。' },
  { id: 'reverse', title: '逆向学习手记 #3 经验杂谈', status: 'published', updated: '2026-10-11', body: '# 逆向学习手记 #3 经验杂谈\n\n把遇到的问题写下来，留给下次阅读。' },
  { id: 'new', title: '未命名草稿', status: 'draft', updated: '刚刚', body: '# 未命名草稿\n\n从这里开始写……' },
]

function parsePost(path: string, body: string, fileHandle: any): Post {
  const titleFromMeta = body.match(/^title:\s*["']?(.+?)["']?\s*$/m)?.[1]
  const titleFromBody = body.match(/^#\s+(.+)$/m)?.[1]
  const published = !/^published:\s*false\s*$/m.test(body)
  return { id: path, path, fileHandle, title: titleFromMeta ?? titleFromBody ?? path.split('/').pop() ?? '未命名文章', status: published ? 'published' : 'draft', updated: '本地文件', body }
}

async function directoryAt(root: DirectoryHandle, parts: string[]) {
  let current = root
  for (const part of parts) current = await current.getDirectoryHandle(part)
  return current
}

async function readMarkdownFiles(directory: DirectoryHandle, prefix = ''): Promise<Post[]> {
  const posts: Post[] = []
  for await (const [name, entry] of directory.entries()) {
    if (entry.kind === 'file' && name.endsWith('.md')) {
      const file = await entry.getFile()
      posts.push(parsePost(`${prefix}${name}`, await file.text(), entry))
    }
  }
  return posts
}

async function openPostsDirectory(root: DirectoryHandle) {
  for (const candidate of [['src', 'content', 'posts'], ['content', 'posts'], ['posts']]) {
    try { return { directory: await directoryAt(root, candidate), prefix: `${candidate.join('/')}/` } } catch { /* try next layout */ }
  }
  return { directory: root, prefix: '' }
}

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
  const [repo, setRepo] = useState<DirectoryHandle>(null)
  const [repoName, setRepoName] = useState('未连接本地仓库')
  const [message, setMessage] = useState('离线模式')
  const selected = posts.find((post) => post.id === selectedId) ?? posts[0]
  const filtered = useMemo(() => posts.filter((post) => post.title.toLowerCase().includes(query.toLowerCase())), [posts, query])

  useEffect(() => { if (!repo) localStorage.setItem('blog-studio-demo-posts', JSON.stringify(posts)) }, [posts, repo])

  const openRepository = async () => {
    try {
      const picker = (window as any).showDirectoryPicker
      if (!picker) { setMessage('当前浏览器不支持本地目录访问，请使用 Chrome/Edge'); return }
      const handle = await picker({ mode: 'readwrite' })
      const { directory, prefix } = await openPostsDirectory(handle)
      const loaded = await readMarkdownFiles(directory, prefix)
      if (!loaded.length) { setMessage('没有找到 Markdown 文章'); return }
      setRepo(handle); setRepoName(handle.name); setPosts(loaded); setSelectedId(loaded[0].id); setMessage(`已读取 ${loaded.length} 篇文章`)
    } catch (error) {
      if ((error as Error).name !== 'AbortError') setMessage('打开仓库失败，请检查权限')
    }
  }

  const updateBody = (body: string) => setPosts((items) => items.map((post) => post.id === selected?.id ? { ...post, body, updated: '未保存修改' } : post))
  const saveSelected = async () => {
    if (!selected) return
    try {
      if (selected.fileHandle) {
        const writable = await selected.fileHandle.createWritable()
        await writable.write(selected.body)
        await writable.close()
        setPosts((items) => items.map((post) => post.id === selected.id ? { ...post, updated: '刚刚' } : post))
        setMessage(`已保存：${selected.path}`)
      } else {
        localStorage.setItem('blog-studio-demo-posts', JSON.stringify(posts))
        setMessage('已保存到本地原型存储')
      }
    } catch { setMessage('保存失败：请重新授权本地目录') }
  }
  const newPost = () => {
    const post: Post = { id: `draft-${Date.now()}`, title: '未命名草稿', status: 'draft', updated: '未保存修改', body: '# 未命名草稿\n\n' }
    setPosts((items) => [post, ...items]); setSelectedId(post.id); setMessage('新建本地草稿')
  }

  return <div className="studio-shell">
    <header className="studio-header">
      <div className="studio-brand"><span className="studio-mark">B</span><div><strong>Blog Studio</strong><small>离线优先写作台</small></div></div>
      <div className="sync-state"><span className="offline-dot" />{repoName}<button onClick={openRepository}>打开本地仓库</button></div>
    </header>
    <div className="studio-body">
      <aside className="post-sidebar">
        <div className="sidebar-top"><span>文章</span><button className="new-button" onClick={newPost}>＋ 新建</button></div>
        <input className="post-filter" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索文章…" />
        <div className="post-count">{filtered.length} / {posts.length} 篇</div>
        <div className="post-items">{filtered.map((post) => <button key={post.id} className={`post-item ${post.id === selected?.id ? 'selected' : ''}`} onClick={() => setSelectedId(post.id)}><span className="post-item-title">{post.title}</span><span><i className={post.status} />{post.updated}</span></button>)}</div>
      </aside>
      <main className="editor-area">
        <div className="editor-toolbar"><div><span className="crumb">{selected?.path ?? '本地草稿'}</span><strong>{selected?.title}</strong></div><div className="toolbar-actions"><span className="saved">● {message}</span><button onClick={() => setPreview(!preview)}>{preview ? '隐藏预览' : '显示预览'}</button><button onClick={saveSelected}>保存本地</button><button className="publish" onClick={() => setMessage('上传功能将在 GitHub 连接模块中启用')}>选择上传</button></div></div>
        <div className={`workbench ${preview ? '' : 'single'}`}>
          <textarea className="markdown-editor" value={selected?.body ?? ''} onChange={(event) => updateBody(event.target.value)} spellCheck={false} aria-label="Markdown 编辑器" />
          {preview && <article className="markdown-preview" dangerouslySetInnerHTML={{ __html: renderMarkdown(selected?.body ?? '') }} />}
        </div>
      </main>
    </div>
    <footer className="studio-footer"><span>本地优先 · 不联网也能写</span><span>Git / GitHub 同步：下一阶段接入</span></footer>
  </div>
}

export default App
