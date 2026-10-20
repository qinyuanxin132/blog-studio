import { useEffect, useMemo, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
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
  const [repoPath, setRepoPath] = useState('')
  const [repoName, setRepoName] = useState('未连接本地仓库')
  const [gitSnapshot, setGitSnapshot] = useState<{ branch: string; status: string; diffStat: string } | null>(null)
  const [remote, setRemote] = useState('')
  const [message, setMessage] = useState('离线模式')
  const selected = posts.find((post) => post.id === selectedId) ?? posts[0]
  const filtered = useMemo(() => posts.filter((post) => post.title.toLowerCase().includes(query.toLowerCase())), [posts, query])

  useEffect(() => { if (!repo) localStorage.setItem('blog-studio-demo-posts', JSON.stringify(posts)) }, [posts, repo])

  const refreshGit = async (path = repoPath) => {
    if (!path || !(window as any).__TAURI_INTERNALS__) return
    try {
      const snapshot = await invoke<{ branch: string; status: string; diff_stat: string }>('git_snapshot', { repo: path })
      setGitSnapshot({ branch: snapshot.branch, status: snapshot.status, diffStat: snapshot.diff_stat })
      setMessage(snapshot.status ? '有未提交修改' : '工作区干净')
    } catch { setMessage('读取 Git 状态失败，请确认目录是 Git 仓库') }
  }

  const openRepository = async () => {
    try {
      if ((window as any).__TAURI_INTERNALS__) {
        const selected = await open({ directory: true, multiple: false, title: '选择博客 Git 仓库' })
        if (typeof selected !== 'string') return
        setRepoPath(selected); setRepoName(selected.split(/[\\/]/).pop() ?? selected)
        await refreshGit(selected)
        return
      }
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
  const commitLocal = async () => {
    if (!repoPath || !(window as any).__TAURI_INTERNALS__) { setMessage('请先在桌面应用中打开本地 Git 仓库'); return }
    const message = window.prompt('本次提交说明', '更新博客文章')
    if (!message) return
    try {
      await invoke('git_commit', { repo: repoPath, message })
      await refreshGit()
      setMessage('已创建本地 commit，尚未上传')
    } catch (error) { setMessage(`commit 失败：${String(error)}`) }
  }

  const loadRemote = async () => {
    if (!repoPath || !(window as any).__TAURI_INTERNALS__) { setMessage('请先打开本地 Git 仓库'); return }
    try { setRemote(await invoke<string>('git_remote', { repo: repoPath })); setMessage('已读取远程仓库') } catch (error) { setMessage(`读取远程失败：${String(error)}`) }
  }
  const pullRemote = async () => {
    if (!repoPath || !window.confirm('拉取远程会改变本地文件，确定继续吗？')) return
    try { setMessage('正在拉取远程…'); await invoke('git_pull', { repo: repoPath }); await refreshGit(); setMessage('拉取完成，未上传本地修改') } catch (error) { setMessage(`拉取失败：${String(error)}`) }
  }
  const pushRemote = async () => {
    if (!repoPath || !window.confirm('这会把本地 commit 上传到远程 GitHub，确定继续吗？')) return
    try { setMessage('正在上传 GitHub…'); await invoke('git_push', { repo: repoPath }); await refreshGit(); setMessage('已上传到 GitHub') } catch (error) { setMessage(`上传失败：${String(error)}`) }
  }

  const newPost = () => {
    const post: Post = { id: `draft-${Date.now()}`, title: '未命名草稿', status: 'draft', updated: '未保存修改', body: '# 未命名草稿\n\n' }
    setPosts((items) => [post, ...items]); setSelectedId(post.id); setMessage('新建本地草稿')
  }

  return <div className="studio-shell">
    <header className="studio-header">
      <div className="studio-brand"><span className="studio-mark">B</span><div><strong>Blog Studio</strong><small>离线优先写作台</small></div></div>
      <div className="sync-state"><span className="offline-dot" />{repoName}{remote && <span className="remote-label" title={remote}>↗ {remote.split('\n')[0]}</span>}<button onClick={openRepository}>打开本地仓库</button></div>
    </header>
    <div className="studio-body">
      <aside className="post-sidebar">
        <div className="sidebar-top"><span>文章</span><button className="new-button" onClick={newPost}>＋ 新建</button></div>
        <input className="post-filter" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索文章…" />
        <div className="post-count">{filtered.length} / {posts.length} 篇</div>
        <div className="post-items">{filtered.map((post) => <button key={post.id} className={`post-item ${post.id === selected?.id ? 'selected' : ''}`} onClick={() => setSelectedId(post.id)}><span className="post-item-title">{post.title}</span><span><i className={post.status} />{post.updated}</span></button>)}</div>
      </aside>
      <main className="editor-area">
        <div className="editor-toolbar"><div><span className="crumb">{selected?.path ?? '本地草稿'}</span><strong>{selected?.title}</strong></div><div className="toolbar-actions"><span className="saved">● {message}{gitSnapshot?.branch ? ` · ${gitSnapshot.branch}` : ''}</span><button onClick={() => setPreview(!preview)}>{preview ? '隐藏预览' : '显示预览'}</button><button onClick={saveSelected}>保存本地</button><button onClick={() => refreshGit()}>Git 状态</button><button onClick={loadRemote}>远程</button><button onClick={commitLocal}>本地 commit</button><button onClick={pullRemote}>拉取</button><button className="publish" onClick={pushRemote}>确认上传</button></div></div>
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
