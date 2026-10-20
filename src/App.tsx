import { useEffect, useMemo, useRef, useState } from 'react'
import type { ClipboardEvent as ReactClipboardEvent, DragEvent as ReactDragEvent, FormEvent } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import './App.css'

type Post = { id: string; title: string; status: 'draft' | 'published'; updated: string; body: string; path?: string; fileHandle?: any; date?: string; category?: string; tags?: string }

type DirectoryHandle = any

type EditorMode = 'markdown' | 'visual'

const initialPosts: Post[] = [
  { id: 'welcome', title: 'Welcome to Blog Studio', status: 'published', updated: '2026-01-01', date: '2026-01-01', category: 'Notes', tags: 'Getting Started', body: '# Welcome to Blog Studio\n\nThis sample article demonstrates offline editing and preview.\n\n## Start writing\n\nOpen a local Markdown repository to begin.' },
  { id: 'draft', title: 'Untitled draft', status: 'draft', updated: '2026-01-01', date: '2026-01-01', category: 'Drafts', tags: '', body: '# Untitled draft\n\nStart writing here…' },
  { id: 'new', title: '未命名草稿', status: 'draft', updated: '刚刚', body: '# 未命名草稿\n\n从这里开始写……' },
]

function parsePost(path: string, body: string, fileHandle: any): Post {
  const titleFromMeta = body.match(/^title:\s*["']?(.+?)["']?\s*$/m)?.[1]
  const titleFromBody = body.match(/^#\s+(.+)$/m)?.[1]
  const date = body.match(/^date:\s*["']?(.+?)["']?\s*$/m)?.[1]
  const listMeta = (key: string) => body.match(new RegExp(`^${key}:\\s*\\[([^\\]]*)\\]`, 'm'))?.[1].split(',').map((item) => item.replace(/["']/g, '').trim()).filter(Boolean).join(', ')
  const category = listMeta('categories') ?? body.match(/^category:\s*["']?(.+?)["']?\s*$/m)?.[1]?.trim()
  const tags = listMeta('tags')
  const published = !/^published:\s*false\s*$/m.test(body)
  return { id: path, path, fileHandle, title: titleFromMeta ?? titleFromBody ?? path.split('/').pop() ?? '未命名文章', status: published ? 'published' : 'draft', updated: date ?? '本地文件', date, category, tags, body }
}

const sortPosts = (items: Post[]) => [...items].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))

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

function htmlToMarkdown(html: string) {
  const document = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  const root = document.body.firstElementChild
  const convert = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? ''
    if (!(node instanceof HTMLElement)) return [...node.childNodes].map(convert).join('')
    const content = [...node.childNodes].map(convert).join('')
    switch (node.tagName.toLowerCase()) {
      case 'h1': return `# ${content.trim()}\\n\\n`
      case 'h2': return `## ${content.trim()}\\n\\n`
      case 'h3': return `### ${content.trim()}\\n\\n`
      case 'strong': case 'b': return `**${content}**`
      case 'em': case 'i': return `*${content}*`
      case 'code': return node.parentElement?.tagName.toLowerCase() === 'pre' ? content : `\`${content}\``
      case 'img': return `![${node.getAttribute('alt') || '图片'}](${node.getAttribute('src') || ''})`
      case 'pre': return '\n```\n' + (node.textContent ?? '') + '\n```\n\n'
      case 'br': return '\\n'
      case 'blockquote': return content.trim().split('\\n').map((line) => `> ${line}`).join('\\n') + '\\n\\n'
      case 'li': return `- ${content.trim()}\\n`
      case 'ul': case 'ol': return `\\n${content}\\n`
      case 'p': return `${content.trim()}\\n\\n`
      default: return content
    }
  }
  return root ? [...root.childNodes].map(convert).join('').replace(/\\n{3,}/g, '\\n\\n').trim() + '\\n' : ''
}

function updateFrontmatter(body: string, key: string, value: string) {
  const line = `${key}: ${value}`
  if (body.startsWith('---\n')) {
    const end = body.indexOf('\n---', 4)
    if (end >= 0) {
      const frontmatter = body.slice(4, end)
      const pattern = new RegExp(`^${key}:.*$`, 'm')
      const next = pattern.test(frontmatter) ? frontmatter.replace(pattern, line) : `${frontmatter}\n${line}`
      return `---\n${next}\n---${body.slice(end + 5)}`
    }
  }
  return `---\n${line}\npublished: true\n---\n\n${body}`
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
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const visualEditorRef = useRef<HTMLDivElement>(null)
  const [editorMode, setEditorMode] = useState<EditorMode>('markdown')
  const [visualHtml, setVisualHtml] = useState('')
  const filtered = useMemo(() => sortPosts(posts.filter((post) => `${post.title} ${post.category ?? ''} ${post.tags ?? ''}`.toLowerCase().includes(query.toLowerCase()))), [posts, query])

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
        const loaded = await invoke<Array<{ path: string; body: string }>>('read_posts', { repo: selected })
        if (!loaded.length) { setMessage('没有找到 Markdown 文章'); return }
        const nativePosts = loaded.map((post) => parsePost(post.path, post.body, null))
        const sortedPosts = sortPosts(nativePosts); setRepoPath(selected); setRepoName(selected.split(/[\\/]/).pop() ?? selected); setPosts(sortedPosts); setSelectedId(sortedPosts[0].id)
        await refreshGit(selected); setMessage(`已读取 ${loaded.length} 篇文章`)
        return
      }
      const picker = (window as any).showDirectoryPicker
      if (!picker) { setMessage('当前浏览器不支持本地目录访问，请使用 Chrome/Edge'); return }
      const handle = await picker({ mode: 'readwrite' })
      const { directory, prefix } = await openPostsDirectory(handle)
      const loaded = await readMarkdownFiles(directory, prefix)
      if (!loaded.length) { setMessage('没有找到 Markdown 文章'); return }
      const sortedPosts = sortPosts(loaded); setRepo(handle); setRepoName(handle.name); setPosts(sortedPosts); setSelectedId(sortedPosts[0].id); setMessage(`已读取 ${loaded.length} 篇文章`)
    } catch (error) {
      if ((error as Error).name !== 'AbortError') setMessage('打开仓库失败，请检查权限')
    }
  }

  const updateBody = (body: string) => setPosts((items) => items.map((post) => post.id === selected?.id ? { ...post, body, updated: '未保存修改' } : post))
  const updateMetadata = (field: 'title' | 'date' | 'category' | 'tags', value: string) => {
    if (!selected) return
    const key = field === 'category' ? 'categories' : field
    const safe = value.replace(/"/g, '\\"')
    const serialized = field === 'title' ? `"${safe}"` : field === 'category' || field === 'tags' ? `[${value.split(',').map((tag) => `"${tag.trim().replace(/"/g, '\\"')}"`).filter(Boolean).join(', ')}]` : value
    const body = updateFrontmatter(selected.body, key, serialized)
    setPosts((items) => items.map((post) => post.id === selected.id ? { ...post, body, [field]: value, updated: '未保存修改' } : post))
  }
  const saveSelected = async () => {
    if (!selected) return
    try {
      if (selected.fileHandle) {
        const writable = await selected.fileHandle.createWritable()
        await writable.write(selected.body)
        await writable.close()
        setPosts((items) => items.map((post) => post.id === selected.id ? { ...post, updated: '刚刚' } : post))
        setMessage(`已保存：${selected.path}`)
      } else if (repoPath && selected.path && (window as any).__TAURI_INTERNALS__) {
        await invoke('write_post', { repo: repoPath, relativePath: selected.path, body: selected.body })
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
  const connectRemote = async () => {
    if (!repoPath || !(window as any).__TAURI_INTERNALS__) { setMessage('请先打开本地 Git 仓库'); return }
    const url = window.prompt('输入 GitHub 仓库 HTTPS 或 SSH 地址', remote || 'https://github.com/用户名/仓库.git')
    if (!url) return
    try { await invoke('git_set_remote', { repo: repoPath, url }); await loadRemote(); setMessage('已连接 GitHub 远程仓库') } catch (error) { setMessage(`连接远程失败：${String(error)}`) }
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
  const enterVisualMode = () => { setVisualHtml(renderMarkdown(selected?.body ?? '')); setEditorMode('visual') }
  const leaveVisualMode = () => { updateBody(htmlToMarkdown(visualEditorRef.current?.innerHTML ?? visualHtml)); setEditorMode('markdown') }
  const visualInput = (event: FormEvent<HTMLDivElement>) => { const html = event.currentTarget.innerHTML; setVisualHtml(html); updateBody(htmlToMarkdown(html)) }
  const visualFormat = (command: string, value?: string) => { visualEditorRef.current?.focus(); document.execCommand(command, false, value); if (visualEditorRef.current) visualInput({ currentTarget: visualEditorRef.current } as FormEvent<HTMLDivElement>) }
  const insertMarkdown = (text: string) => {
    const editor = editorRef.current
    if (!editor || !selected) return
    const start = editor.selectionStart
    const end = editor.selectionEnd
    const nextBody = `${selected.body.slice(0, start)}${text}${selected.body.slice(end)}`
    updateBody(nextBody)
    requestAnimationFrame(() => { editor.focus(); editor.setSelectionRange(start + text.length, start + text.length) })
  }
  const importImageFile = async (file: File) => {
    if (!repoPath || !selected?.path || !(window as any).__TAURI_INTERNALS__) { setMessage('请先在桌面应用中打开本地博客仓库'); return }
    try {
      const data = Array.from(new Uint8Array(await file.arrayBuffer()))
      const relative = await invoke<string>('write_image_bytes', { repo: repoPath, filename: file.name, data })
      const markdown = `![图片](${relative})`
      if (editorMode === 'visual') visualFormat('insertImage', relative)
      else insertMarkdown(markdown)
      setMessage(`已导入图片：${relative}`)
    } catch (error) { setMessage(`图片导入失败：${String(error)}`) }
  }
  const handlePaste = (event: ReactClipboardEvent<HTMLElement>) => {
    const image = Array.from(event.clipboardData.files).find((file) => file.type.startsWith('image/'))
    if (image) { event.preventDefault(); void importImageFile(image) }
  }
  const handleDrop = (event: ReactDragEvent<HTMLElement>) => {
    event.preventDefault()
    const image = Array.from(event.dataTransfer.files).find((file) => file.type.startsWith('image/'))
    if (image) void importImageFile(image)
  }
  const insertImage = async () => {
    if (!repoPath || !selected?.path || !(window as any).__TAURI_INTERNALS__) { setMessage('请先在桌面应用中打开本地博客仓库'); return }
    const source = await open({ multiple: false, directory: false, title: '选择要插入的图片', filters: [{ name: '图片', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] }] })
    if (typeof source !== 'string') return
    try {
      const relative = await invoke<string>('copy_image', { repo: repoPath, postPath: selected.path, sourcePath: source })
      const markdown = `![图片](${relative})`
      if (editorMode === 'visual') visualFormat('insertImage', relative)
      else insertMarkdown(markdown)
      setMessage(`已导入图片：${relative}`)
    } catch (error) { setMessage(`图片导入失败：${String(error)}`) }
  }
  const formatSelection = (before: string, after = '') => {
    const editor = editorRef.current
    if (!editor || !selected) return
    const start = editor.selectionStart
    const end = editor.selectionEnd
    const selectedText = selected.body.slice(start, end) || '文字'
    const nextBody = `${selected.body.slice(0, start)}${before}${selectedText}${after}${selected.body.slice(end)}`
    updateBody(nextBody)
    requestAnimationFrame(() => { editor.focus(); editor.setSelectionRange(start + before.length, start + before.length + selectedText.length) })
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
        <div className="post-items">{filtered.map((post) => <button key={post.id} className={`post-item ${post.id === selected?.id ? 'selected' : ''}`} onClick={() => setSelectedId(post.id)}><span className="post-item-title">{post.title}</span><span><i className={post.status} />{post.date ?? post.updated}</span>{post.category && <small>{post.category}</small>}</button>)}</div>
      </aside>
      <main className="editor-area">
        <div className="editor-toolbar"><div><span className="crumb">{selected?.path ?? '本地草稿'}</span><strong>{selected?.title}</strong></div><div className="toolbar-actions"><span className="saved">● {message}{gitSnapshot?.branch ? ` · ${gitSnapshot.branch}` : ''}</span><button onClick={() => setPreview(!preview)}>{preview ? '隐藏预览' : '显示预览'}</button><button onClick={saveSelected}>保存本地</button><button onClick={() => refreshGit()}>Git 状态</button><button onClick={loadRemote}>远程</button><button onClick={connectRemote}>连接 GitHub</button><button onClick={commitLocal}>本地 commit</button><button onClick={pullRemote}>拉取</button><button className="publish" onClick={pushRemote}>确认上传</button></div></div>
        <div className="metadata-bar" aria-label="文章信息">
          <label>标题<input value={selected?.title ?? ''} onChange={(event) => updateMetadata('title', event.target.value)} /></label>
          <label>日期<input type="date" value={selected?.date ?? ''} onChange={(event) => updateMetadata('date', event.target.value)} /></label>
          <label>分类<input placeholder="可用逗号分隔" value={selected?.category ?? ''} onChange={(event) => updateMetadata('category', event.target.value)} /></label>
          <label>标签<input placeholder="逗号分隔" value={selected?.tags ?? ''} onChange={(event) => updateMetadata('tags', event.target.value)} /></label>
        </div>
        <div className="editor-tools" aria-label="格式工具栏">
          <button className="mode-toggle" onClick={editorMode === 'markdown' ? enterVisualMode : leaveVisualMode}>{editorMode === 'markdown' ? '可视化编辑' : 'Markdown 源码'}</button><span />
          <button title="一级标题" onClick={() => editorMode === 'visual' ? visualFormat('formatBlock', 'h1') : formatSelection('# ')}>H1</button><button title="二级标题" onClick={() => editorMode === 'visual' ? visualFormat('formatBlock', 'h2') : formatSelection('## ')}>H2</button><span />
          <button title="粗体" onClick={() => editorMode === 'visual' ? visualFormat('bold') : formatSelection('**', '**')}><strong>B</strong></button><button title="斜体" onClick={() => editorMode === 'visual' ? visualFormat('italic') : formatSelection('*', '*')}><em>I</em></button><button title="行内代码" onClick={() => formatSelection('`', '`')}>⌘</button><span />
          <button title="无序列表" onClick={() => editorMode === 'visual' ? visualFormat('insertUnorderedList') : formatSelection('- ')}>☷</button><button title="引用" onClick={() => editorMode === 'visual' ? visualFormat('formatBlock', 'blockquote') : formatSelection('> ')}>❯</button><button title="代码块" onClick={() => formatSelection('```\n', '\n```')}>▣</button><button title="插入图片" onClick={insertImage}>▧ 图片</button>
        </div>
        <div className={`workbench ${preview ? '' : 'single'}`}>
          {editorMode === 'visual' ? <div ref={visualEditorRef} className="markdown-editor visual-editor" contentEditable suppressContentEditableWarning dangerouslySetInnerHTML={{ __html: visualHtml }} onInput={visualInput} onPaste={handlePaste} onDrop={handleDrop} onDragOver={(event) => event.preventDefault()} aria-label="可视化文章编辑器" /> : <textarea ref={editorRef} className="markdown-editor" value={selected?.body ?? ''} onChange={(event) => updateBody(event.target.value)} onPaste={handlePaste} onDrop={handleDrop} onDragOver={(event) => event.preventDefault()} spellCheck={false} aria-label="Markdown 编辑器" />}
          {preview && <article className="markdown-preview" dangerouslySetInnerHTML={{ __html: renderMarkdown(selected?.body ?? '') }} />}
        </div>
      </main>
    </div>
    <footer className="studio-footer"><span>本地优先 · 不联网也能写</span><span>Git / GitHub 同步：下一阶段接入</span></footer>
  </div>
}

export default App
