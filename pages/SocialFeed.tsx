
import { useState, useEffect } from 'react';
import { getCurrentUser } from '../services/authService';
import { getSocialPosts, createSocialPost, reactToPost, bookmarkPost, getPostComments, addPostComment } from '../services/dataService';
import { moderateSocialPost } from '../services/geminiService';
import { SocialPost, PostReactionType, UserRole, PostComment } from '../types';
import { Card, Button, Input, Modal, Pagination, MarkdownRenderer } from '../components/UIComponents';
import { Search, Plus, MessageSquare, ThumbsUp, Star, AlertTriangle, Bookmark, Clock, User as UserIcon, Loader2, Send, Info, Lock, ChevronDown, ChevronUp } from 'lucide-react';
import { useGlobalDialog } from '../contexts/GlobalDialogContext';

const PostCommentSection = ({ post, currentUser }: { post: SocialPost, currentUser: any }) => {
    const [comments, setComments] = useState<PostComment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    const isUnlocked = post.useful > 100;

    const loadComments = async () => {
        if (!isExpanded || !isUnlocked) return;
        setIsLoading(true);
        try {
            const data = await getPostComments(post.id);
            setComments(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadComments();
    }, [isExpanded, isUnlocked]);

    const handleAddComment = async () => {
        if (!newComment.trim() || !currentUser) return;
        setIsPosting(true);
        try {
            const res = await addPostComment(post.id, currentUser.id, currentUser.name, newComment);
            setComments([...comments, res]);
            setNewComment('');
        } catch (e) {
            console.error(e);
        } finally {
            setIsPosting(false);
        }
    };

    return (
        <div className="mt-4 pt-4 border-t border-slate-50">
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors"
            >
                <MessageSquare size={16} />
                <span>មតិយោបល់</span>
                {isExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
            </button>

            {isExpanded && (
                <div className="mt-4 animate-in slide-in-from-top-2 duration-300">
                    {!isUnlocked ? (
                        <div className="bg-slate-50 p-6 rounded-xl flex flex-col items-center justify-center text-center border border-dashed border-slate-200">
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm text-slate-300">
                                <Lock size={24} />
                            </div>
                            <p className="text-sm font-bold text-slate-600">មតិយោបល់ត្រូវបានចាក់សោ</p>
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-[250px]">
                                ត្រូវការ "មានប្រយោជន៍" ចំនួន ១០០ ដើម្បីបើកការបញ្ចេញមតិ។ (បច្ចុប្បន្ន: {post.useful})
                            </p>
                            <div className="w-full max-w-[200px] h-1.5 bg-slate-200 rounded-full mt-4 overflow-hidden">
                                <div 
                                    className="h-full bg-rose-500 transition-all duration-1000" 
                                    style={{ width: `${Math.min(100, (post.useful / 100) * 100)}%` }}
                                ></div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Comment List */}
                            <div className="space-y-3">
                                {isLoading ? (
                                    <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-rose-500"/></div>
                                ) : comments.length > 0 ? (
                                    comments.map(c => (
                                        <div key={c.id} className="flex gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0">
                                                <UserIcon size={16} />
                                            </div>
                                            <div className="flex-1 bg-slate-50 p-3 rounded-2xl rounded-tl-none border border-slate-100">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-xs font-bold text-slate-900">{c.authorName}</span>
                                                    <span className="text-[9px] text-slate-400 font-bold">{new Date(c.createdAt).toLocaleDateString('km-KH')}</span>
                                                </div>
                                                <p className="text-xs text-slate-600 leading-relaxed">{c.content}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center text-[10px] text-slate-400 py-2">មិនទាន់មានមតិយោបល់នៅឡើយទេ។</p>
                                )}
                            </div>

                            {/* Comment Input */}
                            <div className="flex gap-2 items-center pt-2">
                                <input 
                                    type="text" 
                                    placeholder="សរសេរមតិរបស់អ្នក..." 
                                    className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-2 text-xs outline-none focus:ring-2 focus:ring-rose-200 transition-all"
                                    value={newComment}
                                    onChange={e => setNewComment(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                                />
                                <button 
                                    onClick={handleAddComment}
                                    disabled={isPosting || !newComment.trim()}
                                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-all disabled:opacity-30"
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const SocialFeed = () => {
    const user = getCurrentUser();
    const { showAlert } = useGlobalDialog();

    const [posts, setPosts] = useState<SocialPost[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterSaved, setFilterSaved] = useState(false);

    // New Post State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newPost, setNewPost] = useState({ title: '', content: '' });
    const [isPosting, setIsPosting] = useState(false);

    useEffect(() => {
        loadPosts();
    }, [user, page, searchQuery, filterSaved]);

    const loadPosts = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const res = await getSocialPosts(user.id, page, 10, searchQuery, filterSaved);
            setPosts(res.data);
            setTotalPages(res.totalPages);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreatePost = async () => {
        if (!user) return;
        if (!newPost.title.trim() || !newPost.content.trim()) {
            showAlert("Error", "សូមបញ្ចូលចំណងជើង និងខ្លឹមសារ។", "warning");
            return;
        }

        // Word count check
        const wordCount = newPost.content.trim().split(/\s+/).length;
        if (wordCount > 600) {
            showAlert("Error", "ខ្លឹមសារមិនអាចលើសពី ៦០០ ពាក្យទេ។ (បច្ចុប្បន្ន: " + wordCount + ")", "danger");
            return;
        }

        setIsPosting(true);
        try {
            // AI Moderation
            const modResult = await moderateSocialPost(newPost.title, newPost.content);
            if (!modResult.allowed) {
                await showAlert("AI Moderation", modResult.reason || "ខ្លឹមសាររបស់អ្នកមិនត្រូវបានអនុញ្ញាតឱ្យបង្ហោះទេ។", "danger");
                setIsPosting(false);
                return;
            }

            await createSocialPost({
                authorId: user.id,
                authorName: user.name,
                authorRole: user.role,
                title: newPost.title,
                content: newPost.content
            });

            setIsCreateModalOpen(false);
            setNewPost({ title: '', content: '' });
            setPage(1);
            loadPosts();
            await showAlert("ជោគជ័យ", "អត្ថបទរបស់អ្នកត្រូវបានបង្ហោះ!", "success");
        } catch (e: any) {
            showAlert("Error", e.message, "danger");
        } finally {
            setIsPosting(false);
        }
    };

    const handleReact = async (postId: string, type: PostReactionType) => {
        if (!user) return;
        // Optimistic UI update
        const updated = posts.map(p => {
            if (p.id === postId) {
                const isToggleOff = p.myReaction === type;
                const newReaction = isToggleOff ? null : type;
                
                let l = p.likes;
                let u = p.useful;
                let f = p.fakes;

                if (p.myReaction === 'LIKE') l--;
                if (p.myReaction === 'USEFUL') u--;
                if (p.myReaction === 'FAKE') f--;

                if (newReaction === 'LIKE') l++;
                if (newReaction === 'USEFUL') u++;
                if (newReaction === 'FAKE') f++;

                return { ...p, myReaction: newReaction, likes: l, useful: u, fakes: f };
            }
            return p;
        });
        setPosts(updated);

        try {
            await reactToPost(postId, user.id, type);
        } catch (e) {
            // Rollback
        }
    };

    const handleBookmark = async (postId: string) => {
        if (!user) return;
        const isNowBookmarked = !posts.find(p => p.id === postId)?.isBookmarked;
        
        setPosts(posts.map(p => p.id === postId ? { ...p, isBookmarked: isNowBookmarked, bookmarksCount: p.bookmarksCount + (isNowBookmarked ? 1 : -1) } : p));
        
        try {
            await bookmarkPost(postId, user.id);
        } catch (e) {
            // Rollback
        }
    };

    const roleColors: { [key: string]: string } = {
        [UserRole.ORGANIZER]: 'bg-blue-100 text-blue-700',
        [UserRole.GENERAL_USER]: 'bg-rose-100 text-rose-700',
        [UserRole.CHEF]: 'bg-amber-100 text-amber-700',
        [UserRole.ADMIN]: 'bg-slate-800 text-white',
    };

    const contentWordCount = newPost.content.trim() === '' ? 0 : newPost.content.trim().split(/\s+/).length;

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold text-slate-800 font-serif flex items-center gap-3">
                        <MessageSquare className="text-rose-600 w-8 h-8" />
                        សហគមន៍
                    </h1>
                    <Button onClick={() => setIsCreateModalOpen(true)} className="rounded-full px-4 py-1.5 shadow-md shadow-rose-200 h-10">
                        <Plus size={18} className="mr-1.5" /> ចែករំលែក
                    </Button>
                </div>
                <p className="text-slate-500 mt-1">ចែករំលែកបទពិសោធន៍ សួរដេញដោល និងរៀនសូត្រពីគ្នាទៅវិញទៅមក។</p>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="ស្វែងរកចំណេះដឹង បទពិសោធន៍..."
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                        value={searchQuery}
                        onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                    />
                </div>
                <button
                    onClick={() => setFilterSaved(!filterSaved)}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all border ${filterSaved ? 'bg-rose-600 text-white border-rose-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                >
                    <Bookmark size={18} className={filterSaved ? 'fill-current' : ''} />
                    បានរក្សាទុក
                </button>
            </div>

            {/* Posts Feed */}
            {isLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-rose-600 w-10 h-10" /></div>
            ) : (
                <div className="space-y-6">
                    {posts.map(post => (
                        <Card key={post.id} className="overflow-hidden border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                                        <UserIcon size={24} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 leading-none">{post.authorName}</p>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${roleColors[post.authorRole] || 'bg-slate-100 text-slate-600'}`}>
                                                {post.authorRole.replace('_', ' ')}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-bold flex items-center">
                                                <Clock size={10} className="mr-1" />
                                                {new Date(post.createdAt).toLocaleDateString('km-KH')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleBookmark(post.id)}
                                    className={`p-2 rounded-full transition-colors ${post.isBookmarked ? 'bg-rose-50 text-rose-600' : 'text-slate-300 hover:bg-slate-50 hover:text-slate-500'}`}
                                >
                                    <Bookmark size={20} className={post.isBookmarked ? 'fill-current' : ''} />
                                </button>
                            </div>

                            <h2 className="text-xl font-bold text-slate-900 mb-3 font-serif leading-tight">{post.title}</h2>
                            <div className="text-slate-600 text-sm leading-relaxed mb-6">
                                <MarkdownRenderer content={post.content} />
                            </div>

                            {/* Reactions Area */}
                            <div className="pt-4 border-t border-slate-50 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
                                <div className="flex items-center gap-1.5 md:gap-3">
                                    <button
                                        onClick={() => handleReact(post.id, 'LIKE')}
                                        className={`flex items-center gap-1 px-2 py-1.5 rounded-full text-[10px] sm:text-xs font-bold transition-all ${post.myReaction === 'LIKE' ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-100' : 'bg-slate-50 text-slate-500 hover:bg-blue-50 hover:text-blue-600'}`}
                                    >
                                        <ThumbsUp size={14} className={`sm:w-4 sm:h-4 ${post.myReaction === 'LIKE' ? 'fill-current' : ''}`} />
                                        <span>ចូលចិត្ត ({post.likes})</span>
                                    </button>
                                    <button
                                        onClick={() => handleReact(post.id, 'USEFUL')}
                                        className={`flex items-center gap-1 px-2 py-1.5 rounded-full text-[10px] sm:text-xs font-bold transition-all ${post.myReaction === 'USEFUL' ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100' : 'bg-slate-50 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600'}`}
                                    >
                                        <Star size={14} className={`sm:w-4 sm:h-4 ${post.myReaction === 'USEFUL' ? 'fill-current' : ''}`} />
                                        <span>មានប្រយោជន៍ ({post.useful})</span>
                                    </button>
                                    <button
                                        onClick={() => handleReact(post.id, 'FAKE')}
                                        className={`flex items-center gap-1 px-2 py-1.5 rounded-full text-[10px] sm:text-xs font-bold transition-all ${post.myReaction === 'FAKE' ? 'bg-red-50 text-red-600 ring-1 ring-red-100' : 'bg-slate-50 text-slate-500 hover:bg-red-50 hover:text-red-600'}`}
                                    >
                                        <AlertTriangle size={14} className={`sm:w-4 sm:h-4 ${post.myReaction === 'FAKE' ? 'fill-current' : ''}`} />
                                        <span>មិនពិត ({post.fakes})</span>
                                    </button>
                                </div>
                                <div className="flex-shrink-0 flex items-center gap-2">
                                     <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase">{post.bookmarksCount} បានរក្សាទុក</span>
                                </div>
                            </div>

                            {/* Comment Component */}
                            <PostCommentSection post={post} currentUser={user} />
                        </Card>
                    ))}

                    {posts.length === 0 && (
                        <div className="py-20 text-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200">
                            <MessageSquare size={48} className="mx-auto mb-4 opacity-20" />
                            <p className="font-medium">មិនមានអត្ថបទត្រូវបានរកឃើញទេ។</p>
                            {filterSaved && <p className="text-xs mt-1">អ្នកមិនទាន់បានរក្សាទុកអត្ថបទណាមួយទេ។</p>}
                        </div>
                    )}
                </div>
            )}

            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

            {/* Create Post Modal */}
            <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="ចែករំលែកចំណេះដឹង">
                <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-xl flex gap-3 border border-blue-100">
                        <Info size={20} className="text-blue-600 flex-shrink-0" />
                        <p className="text-xs text-blue-800 leading-relaxed font-medium">
                            សូមចូលរួមចែករំលែកបទពិសោធន៍ល្អៗ ឬសួរដេញដោលអ្វីដែលអ្នកចង់ដឹង។ AI នឹងជួយពិនិត្យមើលខ្លឹមសាររបស់អ្នកដើម្បីរក្សាសុវត្ថិភាពសហគមន៍។
                        </p>
                    </div>

                    <Input
                        label="ចំណងជើង"
                        placeholder="ឧ. បទពិសោធន៍រៀបចំកម្មវិធីឡើងផ្ទះបែបសន្សំសំចៃ..."
                        value={newPost.title}
                        onChange={e => setNewPost({ ...newPost, title: e.target.value })}
                        required
                    />

                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <label className="block text-sm font-bold text-slate-700">ខ្លឹមសារ</label>
                            <span className={`text-[10px] font-bold ${contentWordCount > 600 ? 'text-red-500' : 'text-slate-400'}`}>
                                {contentWordCount} / 600 ពាក្យ
                            </span>
                        </div>
                        <textarea
                            className={`w-full px-4 py-3 bg-slate-100 border rounded-xl focus:bg-white focus:ring-4 focus:ring-rose-50 outline-none transition-all text-sm font-medium h-64 resize-none ${contentWordCount > 600 ? 'border-red-400' : 'border-transparent focus:border-rose-300'}`}
                            placeholder="សរសេរខ្លឹមសារនៅទីនេះ... (អ្នកអាចប្រើ Markdown បាន)"
                            value={newPost.content}
                            onChange={e => setNewPost({ ...newPost, content: e.target.value })}
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)} className="flex-1">បោះបង់</Button>
                        <Button
                            onClick={handleCreatePost}
                            isLoading={isPosting}
                            disabled={isPosting || contentWordCount > 600 || !newPost.title.trim()}
                            className="flex-1 bg-rose-600 shadow-md shadow-rose-200"
                        >
                            {isPosting ? 'កំពុងពិនិត្យ & បង្ហោះ...' : 'បង្ហោះឥឡូវនេះ'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default SocialFeed;
