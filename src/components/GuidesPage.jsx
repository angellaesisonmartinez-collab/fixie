import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus,
  X,
  Check,
  Edit2,
  FileText,
  Clock,
  Wrench,
  Search,
  ChevronDown,
  RotateCw,
  BookOpen
} from 'lucide-react';
import { supabase, safeRealtimeChannel, safeRemoveChannel } from '../lib/supabase';
import {
  subscribeToGuideUpdates,
  registerVisibilityAndOnlineSync,
  broadcastGuideChange,
} from '../lib/realtimeSyncService';
import StudentGuidesPage from './StudentGuidesPage';
import {
  formatGuideDateDisplay,
  getGuideSortTime,
  htmlToPlainText,
  getGuideSnippet,
  cleanHtmlForStorage,
  getSanitizedGuideHtml,
} from '../lib/guideDateUtils';
import { getVisiblePages, getDisplayedCount } from '../lib/paginationUtils';
import './GuidesPage.css';

import { defaultGuides } from '../lib/defaultGuides';
export { defaultGuides };


export default function GuidesPage({ isStudent = false, studentProfile = null, currentUser = null }) {
  // If rendered on the student side, render StudentGuidesPage with student bookmarking
  if (isStudent) {
    return <StudentGuidesPage studentProfile={studentProfile} currentUser={currentUser} />;
  }

  const [guidesList, setGuidesList] = useState(() =>
    [...defaultGuides].sort((a, b) => {
      const diff = getGuideSortTime(b) - getGuideSortTime(a);
      if (diff !== 0) return diff;
      return (a.id || '').localeCompare(b.id || '');
    })
  );
  const [activeCategory, setActiveCategory] = useState('All'); // 'All' | 'Rules' | 'Reminder' | 'How-to'
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const itemsPerPage = 5; // Reference screenshot strictly displays 5 guides per page
  const dropdownRef = useRef(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [successModalType, setSuccessModalType] = useState(null); // 'published' | 'updated' | null
  const [viewingGuide, setViewingGuide] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const addEditorRef = useRef(null);
  const editEditorRef = useRef(null);

  // Add form fields
  const [newCategory, setNewCategory] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [addError, setAddError] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  // Edit form fields
  const [editCategory, setEditCategory] = useState('Rules');
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editError, setEditError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Sync edit editor content when entering edit mode
  useEffect(() => {
    if (isEditing && editEditorRef.current) {
      editEditorRef.current.innerHTML = editContent || '';
    }
  }, [isEditing, editContent]);

  // Toast notification
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsFilterDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Fetch live guides from Supabase
  const fetchGuides = async () => {
    try {
      const { data, error } = await supabase
        .from('guides')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data && data.length > 0) {
        // Ensure newest published guides appear first
        const sorted = [...data].sort((a, b) => {
          const diff = getGuideSortTime(b) - getGuideSortTime(a);
          if (diff !== 0) return diff;
          return (a.id || '').localeCompare(b.id || '');
        });
        setGuidesList(sorted);
      }
    } catch (err) {
      console.warn('Guides live sync notice:', err.message);
    }
  };

  // Execute rich-text toolbar formatting
  const executeFormat = (cmd, ref) => {
    if (ref && ref.current) {
      ref.current.focus();
    }
    document.execCommand(cmd, false, null);
    if (ref && ref.current) {
      const html = ref.current.innerHTML;
      if (ref === addEditorRef) {
        setNewContent(html);
      } else if (ref === editEditorRef) {
        setEditContent(html);
      }
    }
  };

  // Realtime Supabase channel & cross-window sync
  useEffect(() => {
    fetchGuides();

    const handleGuideLiveUpdate = (payload) => {
      if (!payload) return;
      const targetId = payload.id;
      const eventType = payload.eventType || 'UPDATE';

      if (eventType === 'DELETE') {
        setGuidesList((prev) => prev.filter((g) => g.id !== targetId));
      } else if (eventType === 'INSERT') {
        const newGuide = payload.guide || payload.new || payload;
        if (newGuide?.id) {
          setGuidesList((prev) => {
            const exists = prev.some((g) => g.id === newGuide.id);
            if (exists) return prev;
            return [newGuide, ...prev];
          });
        }
      } else {
        setGuidesList((prev) =>
          prev.map((g) => (g.id === targetId ? { ...g, ...payload, ...(payload.new || {}) } : g))
        );
      }
      fetchGuides();
    };

    // 1. Supabase Realtime channel subscription
    let channel = null;
    try {
      channel = safeRealtimeChannel('public:guides-management-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'guides' }, (payload) => {
          const data = payload.new || payload.old || {};
          handleGuideLiveUpdate({
            ...data,
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old,
          });
        })
        .subscribe();
    } catch (chanErr) {
      console.warn('Guides realtime setup note:', chanErr);
    }

    // 2. Cross-component & broadcast listener
    const unsubGuides = subscribeToGuideUpdates(handleGuideLiveUpdate);

    // 3. Tab visibility and network reconnect refetching
    const unsubVisibility = registerVisibilityAndOnlineSync(() => {
      fetchGuides();
    });

    return () => {
      safeRemoveChannel(channel);
      unsubGuides();
      unsubVisibility();
    };
  }, []);

  // Dynamic stat cards computed strictly from current guides data
  const counts = useMemo(() => {
    let rules = 0;
    let reminders = 0;
    let howTo = 0;

    guidesList.forEach((g) => {
      const cat = (g.category || '').toLowerCase();
      if (cat === 'rules' || cat === 'rule') rules++;
      else if (cat === 'reminder' || cat === 'reminders') reminders++;
      else if (cat === 'how-to' || cat === 'howto') howTo++;
    });

    return {
      all: guidesList.length,
      rules,
      reminders,
      howTo,
    };
  }, [guidesList]);

  // Filter guides based on active category and search query
  const filteredGuides = useMemo(() => {
    return guidesList.filter((g) => {
      // Category filter
      if (activeCategory !== 'All') {
        const cat = (g.category || '').toLowerCase();
        if (activeCategory === 'Rules' && !(cat === 'rules' || cat === 'rule')) return false;
        if (
          (activeCategory === 'Reminder' || activeCategory === 'Reminders') &&
          !(cat === 'reminder' || cat === 'reminders')
        )
          return false;
        if (
          (activeCategory === 'How-to' || activeCategory === 'How-To') &&
          !(cat === 'how-to' || cat === 'howto')
        )
          return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = (g.title || '').toLowerCase().includes(q);
        const contentMatch = (g.content || '').toLowerCase().includes(q);
        const previewMatch = (g.preview || '').toLowerCase().includes(q);
        const catMatch = (g.category || '').toLowerCase().includes(q);
        if (!titleMatch && !contentMatch && !previewMatch && !catMatch) return false;
      }

      return true;
    });
  }, [guidesList, activeCategory, searchQuery]);

  // Pagination calculation (5 guides per page)
  const totalItems = filteredGuides.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedGuides = filteredGuides.slice(startIndex, startIndex + itemsPerPage);

  const displayedCount = getDisplayedCount(currentPage, itemsPerPage, totalItems);
  const visiblePages = getVisiblePages(currentPage, totalPages);

  // Reset page when search or category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeCategory]);

  // Ensure currentPage is valid if totalPages changes
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // Handle Category Filter Change (via stat card or dropdown)
  const handleCategorySelect = (category) => {
    setActiveCategory(category);
    setCurrentPage(1);
    setIsFilterDropdownOpen(false);
  };

  // Reset & Refresh handler (keeps reset icon stationary and steady)
  const handleResetAllFilters = async () => {
    setSearchQuery('');
    setActiveCategory('All');
    setCurrentPage(1);
    await fetchGuides();
  };
  const handleRefresh = handleResetAllFilters;

  // Format Date for Guide Items strictly matching Requirement 3
  const formatGuideDate = (guide) => {
    return formatGuideDateDisplay(guide);
  };

  // Transform guide content or bullet points to rich HTML for editor
  const formatGuideToHtml = (guide) => {
    if (!guide) return '';
    if (guide.content && /<[a-z][\s\S]*>/i.test(guide.content)) {
      return guide.content;
    }
    if (guide.leadText && guide.bulletPoints && guide.bulletPoints.length > 0) {
      return `<p><b>${guide.leadText}</b></p><ul>${guide.bulletPoints.map((b) => `<li>${b}</li>`).join('')}</ul>`;
    }
    const lines = (guide.content || guide.preview || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return '';
    const first = lines[0];
    const rest = lines.slice(1);
    const isList = rest.some((l) => /^[0-9]+[.)]\s*|^[-*•]\s*/.test(l));
    if (isList) {
      const listItems = rest.map((l) => `<li>${l.replace(/^[0-9]+[.)]\s*|^[-*•]\s*/, '').trim()}</li>`).join('');
      return `<p><b>${first}</b></p><ul>${listItems}</ul>`;
    }
    return lines.map((p) => `<p>${p}</p>`).join('');
  };

  // Helper for rendering formatted content in Image 1 Details Modal
  const renderGuideDetailsContent = (guide) => {
    if (!guide) return null;
    return (
      <div
        className="guide-details-rich-content"
        dangerouslySetInnerHTML={{ __html: getSanitizedGuideHtml(guide) }}
      />
    );
  };

  // Get description snippet preview using shared helper
  const getGuidePreview = (guide) => {
    return getGuideSnippet(guide);
  };

  // Open View Modal (Technical Personnel: Details Modal Image 1)
  const handleOpenViewGuide = (guide) => {
    setViewingGuide(guide);
    setIsEditing(false);
    setEditCategory(guide.category === 'Reminder' ? 'Reminders' : guide.category || 'Rules');
    setEditTitle(guide.title || '');
    const html = formatGuideToHtml(guide);
    setEditContent(html);
    setEditError('');
  };

  // Handle Add Guide Submit
  const handlePublishGuide = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setAddError('');

    if (!newTitle.trim()) {
      setAddError('Please enter a guide title.');
      return;
    }

    const rawHtml = addEditorRef.current ? addEditorRef.current.innerHTML : newContent;
    const cleanedHtml = cleanHtmlForStorage(rawHtml);
    const strippedText = htmlToPlainText(cleanedHtml);
    if (!strippedText) {
      setAddError('Please enter guide details.');
      return;
    }

    setIsPublishing(true);
    const nowIso = new Date().toISOString();
    const categoryToSave = newCategory === 'Reminders' ? 'Reminder' : (newCategory || 'Rules');

    try {
      const { data, error } = await supabase
        .from('guides')
        .insert([
          {
            category: categoryToSave,
            title: newTitle.trim(),
            content: cleanedHtml.trim(),
            created_at: nowIso,
            updated_at: nowIso,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      const saved = data || {
        id: 'guide-' + Date.now(),
        category: categoryToSave,
        title: newTitle.trim(),
        content: cleanedHtml.trim(),
        created_at: nowIso,
        updated_at: nowIso,
      };

      setGuidesList((prev) =>
        [saved, ...prev.filter((g) => g.id !== saved.id)].sort((a, b) => {
          const diff = getGuideSortTime(b) - getGuideSortTime(a);
          if (diff !== 0) return diff;
          return (a.id || '').localeCompare(b.id || '');
        })
      );
      setIsAddModalOpen(false);
      setNewTitle('');
      setNewContent('');
      if (addEditorRef.current) addEditorRef.current.innerHTML = '';
      setNewCategory('');
      setSuccessModalType('published');

      // Dispatch cross-component synchronization event for dashboard
      window.dispatchEvent(
        new CustomEvent('fixie_guide_updated', {
          detail: { action: 'publish', guide: saved },
        })
      );
      try {
        localStorage.setItem('fixie_guides_last_updated', Date.now().toString());
      } catch {}
    } catch (err) {
      console.warn('Fallback local guide publishing:', err.message);
      const mockId = 'local-' + Date.now();
      const localGuide = {
        id: mockId,
        category: categoryToSave,
        title: newTitle.trim(),
        content: cleanedHtml.trim(),
        created_at: nowIso,
        updated_at: nowIso,
      };
      setGuidesList((prev) =>
        [localGuide, ...prev].sort((a, b) => {
          const diff = getGuideSortTime(b) - getGuideSortTime(a);
          if (diff !== 0) return diff;
          return (a.id || '').localeCompare(b.id || '');
        })
      );
      setIsAddModalOpen(false);
      setNewTitle('');
      setNewContent('');
      if (addEditorRef.current) addEditorRef.current.innerHTML = '';
      setNewCategory('');
      setSuccessModalType('published');

      window.dispatchEvent(
        new CustomEvent('fixie_guide_updated', {
          detail: { action: 'publish', guide: localGuide },
        })
      );
    } finally {
      setIsPublishing(false);
    }
  };

  // Handle Update Guide Submit (category changes dynamically adjust both old and new counts)
  const handleUpdateGuide = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setEditError('');

    if (!editTitle.trim()) {
      setEditError('Please enter a guide title.');
      return;
    }

    const rawHtml = editEditorRef.current ? editEditorRef.current.innerHTML : editContent;
    const cleanedHtml = cleanHtmlForStorage(rawHtml);
    const strippedText = htmlToPlainText(cleanedHtml);
    if (!strippedText) {
      setEditError('Please enter guide content.');
      return;
    }

    setIsUpdating(true);
    const nowIso = new Date().toISOString();
    const categoryToSave = editCategory === 'Reminders' ? 'Reminder' : editCategory;

    try {
      const { error } = await supabase
        .from('guides')
        .update({
          category: categoryToSave,
          title: editTitle.trim(),
          content: cleanedHtml.trim(),
          updated_at: nowIso,
        })
        .eq('id', viewingGuide.id);

      if (error) throw error;

      const updated = {
        ...viewingGuide,
        category: categoryToSave,
        title: editTitle.trim(),
        content: cleanedHtml.trim(),
        updated_at: nowIso,
      };

      // Keep position based on original publication date, do not move to top
      setGuidesList((prev) =>
        prev
          .map((g) => (g.id === viewingGuide.id ? updated : g))
          .sort((a, b) => {
            const diff = getGuideSortTime(b) - getGuideSortTime(a);
            if (diff !== 0) return diff;
            return (a.id || '').localeCompare(b.id || '');
          })
      );
      setViewingGuide(null);
      setIsEditing(false);
      setSuccessModalType('updated');
      showToast('Guide Updated!');

      window.dispatchEvent(
        new CustomEvent('fixie_guide_updated', {
          detail: { action: 'update', guide: updated },
        })
      );
      try {
        localStorage.setItem('fixie_guides_last_updated', Date.now().toString());
      } catch {}
    } catch (err) {
      console.warn('Fallback local update:', err.message);
      const updated = {
        ...viewingGuide,
        category: categoryToSave,
        title: editTitle.trim(),
        content: cleanedHtml.trim(),
        updated_at: nowIso,
      };
      setGuidesList((prev) =>
        prev
          .map((g) => (g.id === viewingGuide.id ? updated : g))
          .sort((a, b) => {
            const diff = getGuideSortTime(b) - getGuideSortTime(a);
            if (diff !== 0) return diff;
            return (a.id || '').localeCompare(b.id || '');
          })
      );
      setViewingGuide(null);
      setIsEditing(false);
      setSuccessModalType('updated');
      showToast('Guide Updated!');

      window.dispatchEvent(
        new CustomEvent('fixie_guide_updated', {
          detail: { action: 'update', guide: updated },
        })
      );
      try {
        localStorage.setItem('fixie_guides_last_updated', Date.now().toString());
      } catch {}
    } finally {
      setIsUpdating(false);
    }
  };

  // Helper for rendering category badge pill
  const renderCategoryBadge = (category) => {
    const cat = (category || '').toLowerCase();
    if (cat === 'rules' || cat === 'rule') {
      return <span className="tech-guide-badge badge-rules-pill">Rules</span>;
    }
    if (cat === 'how-to' || cat === 'howto') {
      return <span className="tech-guide-badge badge-howto-pill">How-to</span>;
    }
    return <span className="tech-guide-badge badge-reminder-pill">Reminder</span>;
  };

  return (
    <div className="tech-guides-viewport">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="tech-guides-toast" role="status" aria-live="polite">
          <div className="tech-toast-icon-circle">
            <Check size={14} strokeWidth={3} />
          </div>
          <span className="tech-toast-text">{toastMessage}</span>
        </div>
      )}

      {/* 1. Top Header: Matching Students Page Banner Styling (White card, no circle rings, Add Guide on right) */}
      <section className="tech-guides-header-row" aria-label="Laboratory Guide Header">
        <div className="tech-guides-header-left">
          <h1 className="tech-guides-header-title">Guide Management</h1>
          <p className="tech-guides-header-subtitle">
            Create, organize, and update laboratory safety guidelines and troubleshooting resources for students.
          </p>
        </div>

        {/* Right Action: + Add Guide Button */}
        <button
          type="button"
          className="tech-guides-btn-add"
          onClick={() => {
            setNewCategory('');
            setNewTitle('');
            setNewContent('');
            setAddError('');
            setIsAddModalOpen(true);
          }}
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Add Guide</span>
        </button>
      </section>

      {/* 2. Stat Cards Grid: Exact replica of Active Students card UI */}
      <div className="tech-guides-stats-grid" aria-label="Laboratory Guide Stat Metrics">
        {/* Card 1: ALL GUIDES (Slightly greener appearance to distinguish, matching Fixie palette) */}
        <div
          className={`student-metric-card tech-stat-card card-all-guides ${activeCategory === 'All' ? 'card-filter-active' : ''}`}
          onClick={() => handleCategorySelect('All')}
          role="button"
          tabIndex={0}
          title="Filter by All Guides"
        >
          <div className="student-metric-header">
            <span className="student-metric-title">ALL GUIDES</span>
            <div className="student-metric-badge badge-active-green" aria-hidden="true">
              <FileText size={18} strokeWidth={2.2} />
            </div>
          </div>
          <div className="student-metric-value-wrap">
            <span className="student-metric-number">{counts.all}</span>
          </div>
          <p className="student-metric-caption">Total published guides.</p>
        </div>

        {/* Card 2: RULES */}
        <div
          className={`student-metric-card tech-stat-card ${activeCategory === 'Rules' ? 'card-filter-active' : ''}`}
          onClick={() => handleCategorySelect(activeCategory === 'Rules' ? 'All' : 'Rules')}
          role="button"
          tabIndex={0}
          title="Filter by Rules"
        >
          <div className="student-metric-header">
            <span className="student-metric-title">RULES</span>
            <div className="student-metric-badge badge-rules-gold" aria-hidden="true">
              <Clock size={18} strokeWidth={2.2} />
            </div>
          </div>
          <div className="student-metric-value-wrap">
            <span className="student-metric-number">{counts.rules}</span>
          </div>
          <p className="student-metric-caption">Laboratory rules and conduct.</p>
        </div>

        {/* Card 3: REMINDERS */}
        <div
          className={`student-metric-card tech-stat-card ${activeCategory === 'Reminder' || activeCategory === 'Reminders' ? 'card-filter-active' : ''}`}
          onClick={() => handleCategorySelect(activeCategory === 'Reminder' || activeCategory === 'Reminders' ? 'All' : 'Reminder')}
          role="button"
          tabIndex={0}
          title="Filter by Reminders"
        >
          <div className="student-metric-header">
            <span className="student-metric-title">REMINDERS</span>
            <div className="student-metric-badge badge-reminders-blue" aria-hidden="true">
              <Wrench size={18} strokeWidth={2.2} />
            </div>
          </div>
          <div className="student-metric-value-wrap">
            <span className="student-metric-number">{counts.reminders}</span>
          </div>
          <p className="student-metric-caption">Safety tips and reminders.</p>
        </div>

        {/* Card 4: HOW-TO */}
        <div
          className={`student-metric-card tech-stat-card ${activeCategory === 'How-to' || activeCategory === 'How-To' ? 'card-filter-active' : ''}`}
          onClick={() => handleCategorySelect(activeCategory === 'How-to' || activeCategory === 'How-To' ? 'All' : 'How-to')}
          role="button"
          tabIndex={0}
          title="Filter by How-To"
        >
          <div className="student-metric-header">
            <span className="student-metric-title">HOW-TO</span>
            <div className="student-metric-badge badge-howto-green" aria-hidden="true">
              <Check size={18} strokeWidth={2.8} />
            </div>
          </div>
          <div className="student-metric-value-wrap">
            <span className="student-metric-number">{counts.howTo}</span>
          </div>
          <p className="student-metric-caption">Procedures and tutorials.</p>
        </div>
      </div>

      {/* 3. Search & Filter Bar: Matching Students Page Filter Controls */}
      <div className="students-filter-controls-bar tech-guides-filter-bar">
        {/* Search Input Box */}
        <div className="students-search-field-wrap">
          <Search size={15} className="search-box-icon" />
          <input
            type="text"
            className="students-search-field-input"
            placeholder="Search by title, category, or description"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => {
                setSearchQuery('');
                setCurrentPage(1);
              }}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status / Category Dropdown Filter */}
        <div className="students-dropdown-container" ref={dropdownRef}>
          <button
            type="button"
            className="students-filter-dropdown-trigger"
            onClick={() => setIsFilterDropdownOpen((prev) => !prev)}
            aria-expanded={isFilterDropdownOpen}
          >
            <span>
              {activeCategory === 'All'
                ? 'All Statuses'
                : activeCategory === 'Reminder' || activeCategory === 'Reminders'
                ? 'Reminders'
                : activeCategory}
            </span>
            <ChevronDown size={14} className={isFilterDropdownOpen ? 'rotate-180' : ''} />
          </button>

          {isFilterDropdownOpen && (
            <div className="students-filter-menu-popover" role="menu">
              {[
                { id: 'All', label: 'All Statuses' },
                { id: 'Rules', label: 'Rules' },
                { id: 'Reminder', label: 'Reminders' },
                { id: 'How-to', label: 'How-To' },
              ].map((opt) => {
                const isSelected =
                  opt.id === 'All'
                    ? activeCategory === 'All'
                    : opt.id === 'Reminder'
                    ? activeCategory === 'Reminder' || activeCategory === 'Reminders'
                    : opt.id === 'How-to'
                    ? activeCategory === 'How-to' || activeCategory === 'How-To'
                    : activeCategory === opt.id;

                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`dropdown-opt-btn ${isSelected ? 'selected-opt' : ''}`}
                    onClick={() => handleCategorySelect(opt.id)}
                    role="menuitem"
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check size={14} className="opt-check" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Reset All Filters Button (Stationary, steady, does not rotate or shift) */}
        <button
          type="button"
          className="students-refresh-icon-btn"
          onClick={handleResetAllFilters}
          title="Reset all filters"
          aria-label="Reset all filters and restore default list"
        >
          <RotateCw size={16} />
        </button>
      </div>

      {/* 3. All Information Guides Directory Table Container */}
      <section className="tech-guides-table-card" aria-label="Laboratory Guides Directory">
        {/* Table Top Header Bar */}
        <div className="tech-guides-table-header">
          <span className="tech-guides-table-title">
            {activeCategory === 'All'
              ? 'ALL INFORMATION GUIDES'
              : `${activeCategory.toUpperCase()} INFORMATION GUIDES`}
          </span>
        </div>

        {/* List Body */}
        <div className="tech-guides-list-body">
          {paginatedGuides.length === 0 ? (
            <div className="tech-guides-empty-state">
              <BookOpen size={36} className="empty-icon" />
              <p className="empty-text">No guides found matching your filters</p>
            </div>
          ) : (
            paginatedGuides.map((guide) => (
              <div
                key={guide.id}
                className="tech-guide-row"
                onClick={() => handleOpenViewGuide(guide)}
                role="button"
                tabIndex={0}
              >
                <div className="tech-guide-row-left">
                  <h3 className="tech-guide-row-title">{guide.title}</h3>
                  <p className="tech-guide-row-desc">{getGuidePreview(guide)}</p>
                  <span className="tech-guide-row-date">{formatGuideDate(guide)}</span>
                </div>
                <div className="tech-guide-row-badge-wrap">
                  {renderCategoryBadge(guide.category)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Table Footer Bar & Pagination (Strictly 5 guides per page) */}
        <div className="tech-guides-table-footer">
          <div className="tech-guides-footer-count">
            Showing <strong className="count-num">{displayedCount}</strong> of{' '}
            <strong className="count-num">{totalItems}</strong> results
          </div>

          <div className="tech-guides-pagination">
            <button
              type="button"
              className="tech-pagination-btn"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>

            <div className="tech-pagination-pages-group">
              {visiblePages.map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  className={`tech-pagination-page ${currentPage === pageNum ? 'page-active' : 'page-inactive'}`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="tech-pagination-btn"
              disabled={currentPage >= totalPages || totalItems === 0}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {/* 4. Add Guide Form Modal (Image 1 Exact Replication) */}
      {isAddModalOpen && (
        <div className="tech-modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="add-guide-modal-card" onClick={(e) => e.stopPropagation()}>
            {/* Top Header matching Image 1: #072617, white title and subtitle, no close button */}
            <div className="add-guide-modal-header">
              <h2 className="add-guide-modal-title">Add Guide</h2>
              <p className="add-guide-modal-subtitle">Students will see this once it’s posted.</p>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handlePublishGuide}>
              <div className="add-guide-modal-body">
                {addError && (
                  <div className="add-guide-error-banner" role="alert">
                    {addError}
                  </div>
                )}

                {/* 1. Category Field with 3 pill buttons */}
                <div className="add-guide-field-group">
                  <label className="add-guide-field-label">Category</label>
                  <div className="add-guide-category-group" role="radiogroup" aria-label="Category Selection">
                    {['Rules', 'How-to', 'Reminders'].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        className={`add-guide-category-btn ${newCategory === cat ? 'active' : ''}`}
                        onClick={() => setNewCategory(cat)}
                        role="radio"
                        aria-checked={newCategory === cat}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Title Field */}
                <div className="add-guide-field-group">
                  <label className="add-guide-field-label" htmlFor="add-guide-title-input">
                    Title
                  </label>
                  <input
                    id="add-guide-title-input"
                    type="text"
                    className="add-guide-input"
                    placeholder="e.g., Proper Shutdown Procedure"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    autoFocus
                  />
                </div>

                {/* 3. Details Rich-Text Editor Field */}
                <div className="add-guide-field-group">
                  <label className="add-guide-field-label">Details</label>
                  <div className="add-guide-editor-box">
                    {/* Formatting Toolbar */}
                    <div className="add-guide-toolbar" role="toolbar" aria-label="Rich text editor toolbar">
                      {/* Bold */}
                      <button
                        type="button"
                        className="add-guide-toolbar-btn btn-bold"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          executeFormat('bold', addEditorRef);
                        }}
                        title="Bold"
                        aria-label="Bold"
                      >
                        <b>B</b>
                      </button>

                      {/* Italic */}
                      <button
                        type="button"
                        className="add-guide-toolbar-btn btn-italic"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          executeFormat('italic', addEditorRef);
                        }}
                        title="Italic"
                        aria-label="Italic"
                      >
                        <i>I</i>
                      </button>

                      {/* Underline */}
                      <button
                        type="button"
                        className="add-guide-toolbar-btn btn-underline"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          executeFormat('underline', addEditorRef);
                        }}
                        title="Underline"
                        aria-label="Underline"
                      >
                        <u>U</u>
                      </button>

                      <div className="add-guide-toolbar-divider" />

                      {/* Bullet List */}
                      <button
                        type="button"
                        className="add-guide-toolbar-btn"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          executeFormat('insertUnorderedList', addEditorRef);
                        }}
                        title="Bulleted list"
                        aria-label="Bulleted list"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="9" y1="6" x2="20" y2="6"></line>
                          <line x1="9" y1="12" x2="20" y2="12"></line>
                          <line x1="9" y1="18" x2="20" y2="18"></line>
                          <circle cx="4" cy="6" r="1.5" fill="currentColor"></circle>
                          <circle cx="4" cy="12" r="1.5" fill="currentColor"></circle>
                          <circle cx="4" cy="18" r="1.5" fill="currentColor"></circle>
                        </svg>
                      </button>

                      {/* Numbered List */}
                      <button
                        type="button"
                        className="add-guide-toolbar-btn"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          executeFormat('insertOrderedList', addEditorRef);
                        }}
                        title="Numbered list"
                        aria-label="Numbered list"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="10" y1="6" x2="20" y2="6"></line>
                          <line x1="10" y1="12" x2="20" y2="12"></line>
                          <line x1="10" y1="18" x2="20" y2="18"></line>
                          <text x="2" y="8" fontSize="7.5" fontWeight="bold" fill="currentColor" stroke="none">1</text>
                          <text x="2" y="14" fontSize="7.5" fontWeight="bold" fill="currentColor" stroke="none">2</text>
                          <text x="2" y="20" fontSize="7.5" fontWeight="bold" fill="currentColor" stroke="none">3</text>
                        </svg>
                      </button>
                    </div>

                    {/* Contenteditable Editing Area */}
                    <div
                      ref={addEditorRef}
                      className="add-guide-editor-content"
                      contentEditable="true"
                      role="textbox"
                      aria-multiline="true"
                      data-placeholder="Write the rule, steps, or reminder here"
                      onInput={(e) => setNewContent(e.currentTarget.innerHTML)}
                      onBlur={(e) => setNewContent(e.currentTarget.innerHTML)}
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer matching Image 1: #072617, Cancel link, Publish button */}
              <div className="add-guide-modal-footer">
                <button
                  type="button"
                  className="add-guide-btn-cancel"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="add-guide-btn-publish"
                  disabled={isPublishing}
                >
                  {isPublishing ? 'Publishing...' : 'Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Success Modal (Image 3 Replication: Guide Updated! and Guide Published!) */}
      {successModalType && (
        <div className="tech-modal-overlay" onClick={() => setSuccessModalType(null)}>
          <div className="guide-published-modal-card" onClick={(e) => e.stopPropagation()}>
            {/* Top Half: Soft Mint/Sage with Fixie Mascot, Heading, Subtitle */}
            <div className="guide-published-top">
              <img
                src={fixieMascotSuccess}
                alt={successModalType === 'updated' ? 'Guide Updated Success' : 'Guide Published Success'}
                className="guide-published-mascot"
              />
              <h2 className="guide-published-title">
                {successModalType === 'updated' ? 'Guide Updated!' : 'Guide Published!'}
              </h2>
              <p className="guide-published-subtitle">
                {successModalType === 'updated'
                  ? 'Your guide has been successfully updated and posted.'
                  : 'Your guide has been successfully published.'}
              </p>
            </div>

            {/* Bottom Half: Pure White with Continue Button */}
            <div className="guide-published-bottom">
              <button
                type="button"
                className="guide-published-continue-btn"
                onClick={() => {
                  setSuccessModalType(null);
                }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Guide Details Modal (Image 1 Exact Replication) */}
      {viewingGuide && !isEditing && (
        <div className="tech-modal-overlay" onClick={() => setViewingGuide(null)}>
          <div className="guide-details-modal-card" onClick={(e) => e.stopPropagation()}>
            {/* Top Header matching Image 1: #072617, title and date on left, category pill on right */}
            <div className="guide-details-modal-header">
              <div className="guide-details-header-left">
                <h2 className="guide-details-header-title">{viewingGuide.title}</h2>
                <p className="guide-details-header-date">
                  {formatGuideDateDisplay(viewingGuide)}
                </p>
              </div>

              <div className="guide-details-header-right">
                <span
                  className={`guide-details-category-pill ${
                    (viewingGuide.category || '').toLowerCase() === 'rules' ||
                    (viewingGuide.category || '').toLowerCase() === 'rule'
                      ? 'category-rules'
                      : (viewingGuide.category || '').toLowerCase() === 'reminder' ||
                        (viewingGuide.category || '').toLowerCase() === 'reminders'
                        ? 'category-reminder'
                        : 'category-howto'
                  }`}
                >
                  {viewingGuide.category === 'Reminder' ? 'Reminders' : viewingGuide.category}
                </span>
              </div>
            </div>

            {/* White Body matching Image 1: Lead bold text & bullet points */}
            <div className="guide-details-modal-body">
              {renderGuideDetailsContent(viewingGuide)}
            </div>

            {/* Modal Footer matching Image 1: #072617 background with Close & Edit buttons */}
            <div className="guide-details-modal-footer">
              <button
                type="button"
                className="guide-details-btn-close"
                onClick={() => setViewingGuide(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="guide-details-btn-edit"
                onClick={() => {
                  setIsEditing(true);
                  setEditCategory(
                    viewingGuide.category === 'Reminder' ? 'Reminders' : viewingGuide.category || 'Rules'
                  );
                  setEditTitle(viewingGuide.title || '');
                  const html = formatGuideToHtml(viewingGuide);
                  setEditContent(html);
                  setEditError('');
                }}
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Edit Guide Modal (Image 2 Exact Replication) */}
      {viewingGuide && isEditing && (
        <div className="tech-modal-overlay" onClick={() => setIsEditing(false)}>
          <div className="edit-guide-modal-card" onClick={(e) => e.stopPropagation()}>
            {/* Top Header matching Image 2: #072617, Edit Guide title & subtitle */}
            <div className="edit-guide-modal-header">
              <h2 className="edit-guide-modal-title">Edit Guide</h2>
              <p className="edit-guide-modal-subtitle">Students will see this once it's posted.</p>
            </div>

            {/* Form matching Image 2 */}
            <form onSubmit={handleUpdateGuide}>
              <div className="edit-guide-modal-body">
                {editError && (
                  <div className="add-guide-error-banner" role="alert">
                    {editError}
                  </div>
                )}

                {/* 1. Category Field (Rules, How-to, Reminders with no hover in default state) */}
                <div className="add-guide-field-group">
                  <label className="add-guide-field-label">Category</label>
                  <div className="add-guide-category-group" role="radiogroup" aria-label="Category Selection">
                    {['Rules', 'How-to', 'Reminders'].map((cat) => {
                      const isSelected =
                        editCategory === cat ||
                        (cat === 'Reminders' && editCategory === 'Reminder') ||
                        (cat === 'How-to' && (editCategory === 'How-to' || editCategory === 'How-To'));
                      return (
                        <button
                          key={cat}
                          type="button"
                          className={`add-guide-category-btn ${isSelected ? 'active' : ''}`}
                          onClick={() => setEditCategory(cat)}
                          role="radio"
                          aria-checked={isSelected}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Title Field */}
                <div className="add-guide-field-group">
                  <label className="add-guide-field-label">Title</label>
                  <input
                    type="text"
                    className="add-guide-input"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="e.g. Log out and shut down after use"
                    required
                  />
                </div>

                {/* 3. Details Rich-Text Editor Field */}
                <div className="add-guide-field-group">
                  <label className="add-guide-field-label">Details</label>
                  <div className="add-guide-editor-box">
                    {/* Formatting Toolbar: Bold, Italic, Underline, Divider, Bullet List, Numbered List */}
                    <div className="add-guide-toolbar" role="toolbar" aria-label="Rich text editor toolbar">
                      <button
                        type="button"
                        className="add-guide-toolbar-btn btn-bold"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          executeFormat('bold', editEditorRef);
                        }}
                        title="Bold"
                        aria-label="Bold"
                      >
                        <b>B</b>
                      </button>
                      <button
                        type="button"
                        className="add-guide-toolbar-btn btn-italic"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          executeFormat('italic', editEditorRef);
                        }}
                        title="Italic"
                        aria-label="Italic"
                      >
                        <i>I</i>
                      </button>
                      <button
                        type="button"
                        className="add-guide-toolbar-btn btn-underline"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          executeFormat('underline', editEditorRef);
                        }}
                        title="Underline"
                        aria-label="Underline"
                      >
                        <u>U</u>
                      </button>
                      <div className="add-guide-toolbar-divider" />
                      <button
                        type="button"
                        className="add-guide-toolbar-btn"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          executeFormat('insertUnorderedList', editEditorRef);
                        }}
                        title="Bulleted list"
                        aria-label="Bulleted list"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="9" y1="6" x2="20" y2="6"></line>
                          <line x1="9" y1="12" x2="20" y2="12"></line>
                          <line x1="9" y1="18" x2="20" y2="18"></line>
                          <circle cx="4" cy="6" r="1.5" fill="currentColor"></circle>
                          <circle cx="4" cy="12" r="1.5" fill="currentColor"></circle>
                          <circle cx="4" cy="18" r="1.5" fill="currentColor"></circle>
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="add-guide-toolbar-btn"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          executeFormat('insertOrderedList', editEditorRef);
                        }}
                        title="Numbered list"
                        aria-label="Numbered list"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="10" y1="6" x2="20" y2="6"></line>
                          <line x1="10" y1="12" x2="20" y2="12"></line>
                          <line x1="10" y1="18" x2="20" y2="18"></line>
                          <text x="2" y="8" fontSize="7.5" fontWeight="bold" fill="currentColor" stroke="none">1</text>
                          <text x="2" y="14" fontSize="7.5" fontWeight="bold" fill="currentColor" stroke="none">2</text>
                          <text x="2" y="20" fontSize="7.5" fontWeight="bold" fill="currentColor" stroke="none">3</text>
                        </svg>
                      </button>
                    </div>

                    {/* Contenteditable Editing Area */}
                    <div
                      ref={editEditorRef}
                      className="add-guide-editor-content"
                      contentEditable="true"
                      role="textbox"
                      aria-multiline="true"
                      data-placeholder="Write guide details here..."
                      onInput={(e) => setEditContent(e.currentTarget.innerHTML)}
                      onBlur={(e) => setEditContent(e.currentTarget.innerHTML)}
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer matching Image 2: #072617, Cancel link, Update button */}
              <div className="edit-guide-modal-footer">
                <button
                  type="button"
                  className="edit-guide-btn-cancel"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="edit-guide-btn-update"
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Updating...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
