import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import {
  ChevronLeft,
  Plus,
  Trash2,
  GripVertical,
  Save,
  X,
  ShieldCheck,
  Hash,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { getIsAdmin } from '../lib/admin';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const makeSlug = (name) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const SortableCategoryRow = ({ cat, editingId, editValue, onStartEdit, onSaveEdit, onCancelEdit, onDelete, onEditChange, onEditKeyDown }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: cat.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-4 py-3 transition-colors ${isDragging ? 'opacity-50 bg-[#080808]' : 'hover:bg-[#080808]'}`}
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-[#71767b] hover:text-[#e7e9ea] transition shrink-0 touch-none"
        title="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} />
      </button>

      <div className="flex-1 min-w-0">
        {editingId === cat.id ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={editValue}
              onChange={(e) => onEditChange(e.target.value)}
              onKeyDown={(e) => onEditKeyDown(e)}
              onBlur={() => onSaveEdit(cat.id)}
              className="flex-1 px-2 py-1 bg-black border border-[#1d9bf0] rounded text-sm text-[#e7e9ea] outline-none"
              style={{ fontSize: '16px' }}
              autoFocus
            />
            <button
              type="button"
              onClick={() => onSaveEdit(cat.id)}
              className="p-1 text-[#1d9bf0] hover:bg-[#1d9bf0]/10 rounded transition"
            >
              <Save size={14} />
            </button>
            <button
              type="button"
              onClick={onCancelEdit}
              className="p-1 text-[#71767b] hover:bg-[#16181c] rounded transition"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onStartEdit(cat)}
            className="text-sm font-medium text-[#e7e9ea] hover:text-[#1d9bf0] transition text-left truncate max-w-full"
            title="Click to rename"
          >
            {cat.name}
          </button>
        )}
        <p className="text-[11px] text-[#71767b] truncate">
          <code className="text-[#536471]">{makeSlug(cat.name)}</code>
        </p>
      </div>

      <div className="hidden sm:flex items-center gap-1 text-[11px] text-[#71767b] shrink-0">
        <Calendar size={10} />
        <span>
          {new Date(cat.created_at).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })}
        </span>
      </div>

      <button
        type="button"
        onClick={() => onDelete(cat)}
        className="p-1.5 text-[#71767b] hover:text-[#f91880] hover:bg-[#f91880]/10 rounded transition shrink-0"
        title={`Delete "${cat.name}"`}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
};

const AdminPanel = ({ currentUser }) => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [error, setError] = useState('');
  const newInputRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  useEffect(() => {
    if (!currentUser) return;
    getIsAdmin().then(admin => {
      setIsAdmin(admin);
      if (!admin) return;
      fetchCategories();
    });
  }, [currentUser]);

  const fetchCategories = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('name', { ascending: true });
    if (!error && data) {
      setCategories(data);
    } else {
      const { data: fallback } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      if (fallback) setCategories(fallback);
    }
    setLoading(false);
  };

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setAdding(true);
    setError('');
    const nextOrder = categories.length;
    const { data, error: err } = await supabase
      .from('categories')
      .insert({ name: trimmed, sort_order: nextOrder })
      .select()
      .single();
    if (err) {
      if (err.code === '23505') {
        setError(`Category "${trimmed}" already exists.`);
      } else {
        setError(err.message || 'Failed to add category.');
      }
    } else if (data) {
      setCategories(prev => [...prev, data]);
      setNewName('');
    }
    setAdding(false);
    newInputRef.current?.focus();
  };

  const handleDelete = async (cat) => {
    if (!window.confirm(`Delete "${cat.name}"? Existing posts using this category will keep the text value.`)) return;
    const { error: err } = await supabase.from('categories').delete().eq('id', cat.id);
    if (err) {
      setError(err.message || 'Failed to delete category.');
    } else {
      setCategories(prev => prev.filter(c => c.id !== cat.id));
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex(c => c.id === active.id);
    const newIndex = categories.findIndex(c => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(categories, oldIndex, newIndex);
    setCategories(reordered);

    const updates = reordered.map((cat, i) => ({
      id: cat.id,
      sort_order: i
    }));
    for (const { id, sort_order } of updates) {
      await supabase
        .from('categories')
        .update({ sort_order })
        .eq('id', id);
    }
  };

  const startEdit = (cat) => {
    setEditingId(cat.id);
    setEditValue(cat.name);
  };

  const saveEdit = async (id) => {
    const trimmed = editValue.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }
    const { error: err } = await supabase
      .from('categories')
      .update({ name: trimmed })
      .eq('id', id);
    if (err) {
      if (err.code === '23505') {
        setError(`Category "${trimmed}" already exists.`);
      } else {
        setError(err.message || 'Failed to update category.');
      }
    } else {
      setCategories(prev =>
        prev.map(c => (c.id === id ? { ...c, name: trimmed } : c))
      );
    }
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleEditChange = (value) => setEditValue(value);

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter' && editingId) saveEdit(editingId);
    if (e.key === 'Escape') cancelEdit();
  };

  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#1d9bf0] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    navigate('/', { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen bg-black animate-slide-in">
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-[#2f3336]">
        <div className="flex items-center gap-4 px-4 h-[53px]">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-1.5 hover:bg-[#16181c] rounded-full transition text-[#e7e9ea]"
          >
            <ChevronLeft size={20} strokeWidth={2.5} />
          </button>
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-[#1d9bf0]" />
            <h2 className="text-lg font-bold text-[#e7e9ea]">Admin Panel</h2>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {error && (
          <div className="flex items-center gap-2 bg-[#f91880]/10 text-[#f91880] px-4 py-3 rounded-lg text-sm animate-slide-in">
            <AlertTriangle size={14} />
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError('')}
              className="ml-auto p-1 hover:bg-[#16181c] rounded-full transition shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Add Category */}
        <section className="bg-[#16181c] rounded-xl border border-[#2f3336] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#2f3336]">
            <h3 className="text-sm font-bold text-[#e7e9ea] flex items-center gap-2">
              <Hash size={14} className="text-[#1d9bf0]" />
              Manage Categories
            </h3>
          </div>
          <div className="p-4">
            <div className="flex gap-2">
              <input
                ref={newInputRef}
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                placeholder="New category name..."
                className="flex-1 px-3 py-2 bg-black border border-[#2f3336] rounded-lg text-sm text-[#e7e9ea] placeholder-[#71767b] outline-none focus:border-[#1d9bf0] transition-colors"
                style={{ fontSize: '16px' }}
              />
              <button
                type="button"
                onClick={handleAdd}
                disabled={adding || !newName.trim()}
                className="px-4 py-2 bg-[#1d9bf0] text-white rounded-lg text-sm font-bold hover:bg-[#1a8cd8] disabled:opacity-30 transition-colors flex items-center gap-1.5 shrink-0"
              >
                <Plus size={14} />
                Add
              </button>
            </div>
            {newName.trim() && (
              <p className="text-[11px] text-[#71767b] mt-1.5">
                Slug: <code className="text-[#1d9bf0]">{makeSlug(newName)}</code>
              </p>
            )}
          </div>
        </section>

        {/* Categories List */}
        <section className="bg-[#16181c] rounded-xl border border-[#2f3336] overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-[#1d9bf0] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : categories.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-[#71767b]">
              No categories yet. Add one above.
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={categories.map(c => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="divide-y divide-[#2f3336]">
                  {categories.map(cat => (
                    <SortableCategoryRow
                      key={cat.id}
                      cat={cat}
                      editingId={editingId}
                      editValue={editValue}
                      onStartEdit={startEdit}
                      onSaveEdit={saveEdit}
                      onCancelEdit={cancelEdit}
                      onDelete={handleDelete}
                      onEditChange={handleEditChange}
                      onEditKeyDown={handleEditKeyDown}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </section>

        {/* Info */}
        <section className="bg-[#16181c] rounded-xl border border-[#2f3336] p-4">
          <p className="text-xs text-[#71767b] leading-relaxed">
            <strong className="text-[#e7e9ea]">Note:</strong> Deleting a category removes it from the selector but existing
            posts keep the text value. Drag the handle (⠿) to reorder categories. Click a category name to rename it.
          </p>
        </section>
      </div>
    </div>
  );
};

export default AdminPanel;
