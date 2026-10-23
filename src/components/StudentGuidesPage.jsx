import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileText,
  Clock,
  Wrench,
  Search,
  ChevronDown,
  RotateCw,
  Check,
  X,
  BookOpen
} from 'lucide-react';
import { supabase, safeRealtimeChannel, safeRemoveChannel } from '../lib/supabase';
import {
  subscribeToGuideUpdates,
  registerVisibilityAndOnlineSync,
} from '../lib/realtimeSyncService';
import {
  formatGuideDateDisplay,
  getGuideSortTime,
  getGuideSnippet,
  getSanitizedGuideHtml,
} from '../lib/guideDateUtils';
import { getVisiblePages, getDisplayedCount } from '../lib/paginationUtils';
import Banner from './Banner';
import { defaultGuides } from '../lib/defaultGuides';
import './StudentGuidesPage.css';

// Canonical shared guides dataset
export const initialStudentGuides = defaultGuides;

// Helper to sort guides strictly by original publication date (created_at) descending
const sortGuidesByPublicationDate = (guides) => {
  return [...guides].sort((a, b) => {
    const diff = getGuideSortTime(b) - getGuideSortTime(a);
    if (diff !== 0) return diff;
    return (a.id || '').localeCompare(b.id || '');
  });
};

// Module-level in-memory cache to eliminate flicker on tab switches
let cachedStudentGuides = null;


export default function StudentGuidesPage({ studentProfile, currentUser }) {
  const [guidesList, setGuidesList] = useState(() => {
    if (cachedStudentGuides && cachedStudentGuides.length > 0) {
      return cachedStudentGuides;
    }
    return sortGuidesByPublicationDate(defaultGuides);
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All'); // 'All' | 'Rules' | 'Reminder' | 'How-to'
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isSavedFilterActive, setIsSavedFilterActive] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const itemsPerPage = 5; // Exactly 5 guides per page matching Technical Personnel Laboratory Guides

  // Modal State for clicked guide
  const [selectedGuideModal, setSelectedGuideModal] = useState(null);

  // Toast State
  const [toastMessage, setToastMessage] = useState(null);

  const categoryDropdownRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const studentNumber = studentProfile?.student_id || '24-0041-147';
  const [studentUuid, setStudentUuid] = useState(studentProfile?.id || null);
  const studentUuidRef = useRef(studentUuid);
  useEffect(() => {
    studentUuidRef.current = studentUuid;
  }, [studentUuid]);

  const viewedTimesStorageKey = `fixie_student_viewed_guide_times_${studentNumber}`;
  const savedStorageKey = `fixie_student_saved_guides_${studentNumber}`;

  // Resolve student UUID from Supabase if not directly provided
  useEffect(() => {
    if (studentProfile?.id && studentProfile.id.length > 20) {
      setStudentUuid(studentProfile.id);
      return;
    }
    const resolveUuid = async () => {
      try {
        const { data } = await supabase
          .from('students')
          .select('id')
          .eq('student_id', studentNumber)
          .maybeSingle();
        if (data?.id) {
          setStudentUuid(data.id);
        }
      } catch (err) {
        console.warn('Student UUID resolve notice:', err);
      }
    };
    resolveUuid();
  }, [studentProfile?.id, studentNumber]);

  // Viewed guides timestamps tracking (persists per student across refreshes and logins)
  const [viewedGuideTimes, setViewedGuideTimes] = useState(() => {
    try {
      const stored = localStorage.getItem(viewedTimesStorageKey);
      if (stored) return JSON.parse(stored);
    } catch {}
    return {};
  });

  // Saved / Bookmarked guides state (scoped to logged-in student)
  const [savedGuideIds, setSavedGuideIds] = useState(() => {
    try {
      const stored =
        localStorage.getItem(savedStorageKey) ||
        localStorage.getItem('fixie_student_saved_guides');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    if (studentNumber === '24-0041-147') {
      return ['24aed21c-afd4-498f-93a7-46033f2aee0c', '24b2299e-b8d1-447a-946b-53eeb103c263', '654a302d-30a2-43d7-bb63-96489ce7ebb9'];
    }
    return [];
  });

  // Re-sync viewed and saved guides when student account switches
  useEffect(() => {
    try {
      const stored = localStorage.getItem(viewedTimesStorageKey);
      setViewedGuideTimes(stored ? JSON.parse(stored) : {});
    } catch {
      setViewedGuideTimes({});
    }
  }, [viewedTimesStorageKey]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(savedStorageKey);
      if (stored) {
        setSavedGuideIds(JSON.parse(stored));
      } else if (studentNumber === '24-0041-147') {
        setSavedGuideIds(['24aed21c-afd4-498f-93a7-46033f2aee0c', '24b2299e-b8d1-447a-946b-53eeb103c263', '654a302d-30a2-43d7-bb63-96489ce7ebb9']);
      } else {
        setSavedGuideIds([]);
      }
    } catch {
      setSavedGuideIds([]);
    }
  }, [savedStorageKey, studentNumber]);

  // Fetch live guides from Supabase (sorted strictly by created_at newest first)
  const mutationRef = useRef(0);
  const fetchGuides = async () => {
    const startedAt = mutationRef.current;
    try {
      const { data, error } = await supabase
        .from('guides')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (mutationRef.current !== startedAt) return; // stale response
      if (data && data.length > 0) {
        // Sort strictly by publication date (created_at) newest first
        const sorted = sortGuidesByPublicationDate(data);
        cachedStudentGuides = sorted;
        // Only re-render when something actually changed (prevents stat card flicker)
        setGuidesList((prev) => {
          const sig = (list) => list.map((g) => `${g.id}|${g.updated_at}|${g.category}|${g.title}`).join(';');
          return sig(prev) === sig(sorted) ? prev : sorted;
        });
      }
    } catch (err) {
      console.warn('Student guides live sync notice:', err.message);
    }
  };

  // Fetch bookmarks from Supabase (saved_guides table)
  const fetchSavedGuides = async (uid) => {
    const targetUid = uid || studentUuid;
    if (!targetUid) return;
    try {
      const { data, error } = await supabase
        .from('saved_guides')
        .select('guide_id')
        .eq('student_id', targetUid);

      if (!error && data) {
        const ids = data.map((row) => row.guide_id);
        setSavedGuideIds(ids);
        try {
          localStorage.setItem(savedStorageKey, JSON.stringify(ids));
        } catch {}
      }
    } catch (err) {
      console.warn('Saved guides sync notice:', err.message);
    }
  };

  // Fetch viewed guide timestamps from Supabase (guide_views table)
  const fetchGuideViews = async (uid) => {
    const targetUid = uid || studentUuid;
    if (!targetUid) return;
    try {
      const { data, error } = await supabase
        .from('guide_views')
        .select('guide_id, last_viewed_at')
        .eq('student_id', targetUid);

      if (!error && data && data.length > 0) {
        setViewedGuideTimes((prev) => {
          const updated = { ...prev };
          data.forEach((row) => {
            if (row.guide_id && row.last_viewed_at) {
              updated[row.guide_id] = new Date(row.last_viewed_at).getTime();
            }
          });
          try {
            localStorage.setItem(viewedTimesStorageKey, JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }
    } catch {
      // Graceful fallback if table is not yet created
    }
  };

  // Realtime Supabase channel & cross-window sync
  useEffect(() => {
    fetchGuides();

    const handleGuideLiveUpdate = (payload) => {
      if (!payload) return;
      mutationRef.current++;
      const targetId = payload.id || payload.guide?.id || payload.new?.id;
      const eventType = payload.eventType || (payload.action === 'publish' ? 'INSERT' : payload.action === 'delete' ? 'DELETE' : 'UPDATE');

      if (eventType === 'DELETE') {
        setGuidesList((prev) => {
          const next = prev.filter((g) => g.id !== targetId);
          cachedStudentGuides = next;
          return next;
        });
      } else if (eventType === 'INSERT') {
        const newGuide = payload.guide || payload.new || payload;
        if (newGuide?.id) {
          setGuidesList((prev) => {
            const exists = prev.some((g) => g.id === newGuide.id);
            if (exists) return prev;
            const next = sortGuidesByPublicationDate([newGuide, ...prev]);
            cachedStudentGuides = next;
            return next;
          });
        }
      } else {
        const updatedGuide = payload.guide || payload.new || payload;
        setGuidesList((prev) => {
          const next = prev.map((g) => (g.id === targetId ? { ...g, ...updatedGuide } : g));
          cachedStudentGuides = next;
          return next;
        });
        setSelectedGuideModal((prevModal) => {
          if (prevModal && prevModal.id === targetId) {
            return { ...prevModal, ...updatedGuide };
          }
          return prevModal;
        });
      }
    };

    // Centralized cross-component & broadcast listener via realtimeSyncService
    const unsubGuides = subscribeToGuideUpdates(handleGuideLiveUpdate);

    const handleStorageEvent = (e) => {
      if (e.key === 'fixie_guides_last_updated' || e.key === 'fixie_guide_action') {
        fetchGuides();
      }
      if (e.key === viewedTimesStorageKey && e.newValue) {
        try {
          setViewedGuideTimes(JSON.parse(e.newValue));
        } catch {}
      }
      if (e.key === savedStorageKey && e.newValue) {
        try {
          setSavedGuideIds(JSON.parse(e.newValue));
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    const unsubVisibility = registerVisibilityAndOnlineSync(() => {
      fetchGuides();
      if (studentUuidRef.current) {
        fetchSavedGuides(studentUuidRef.current);
      }
    });

    // Polling safety net so changes appear automatically even if realtime events are missed
    const pollId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchGuides();
        if (studentUuidRef.current) fetchSavedGuides(studentUuidRef.current);
      }
    }, 4000);

    return () => {
      unsubGuides();
      unsubVisibility();
      clearInterval(pollId);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [viewedTimesStorageKey, savedStorageKey]);

  useEffect(() => {
    if (studentUuid) {
      fetchSavedGuides(studentUuid);
      fetchGuideViews(studentUuid);
    }
  }, [studentUuid]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target)) {
        setIsCategoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Determine if a guide should show NEW or UPDATED badge
  // 1. UPDATED if updated after creation and after the student's last view time
  // 2. NEW if not yet opened/viewed by this student
  // Once the student opens the guide, lastViewed is recorded, clearing the badge for that student.
  const getGuideBadgeStatus = (guide) => {
    if (!guide || !guide.id) return null;
    const lastViewed = viewedGuideTimes[guide.id] || 0;
    const createTime = guide.created_at ? new Date(guide.created_at).getTime() : 0;
    const updateTime = guide.updated_at ? new Date(guide.updated_at).getTime() : 0;

    // If the student has not opened this guide yet, display the green NEW badge
    if (!lastViewed) {
      return 'NEW';
    }

    // If the guide has been updated after the student's last view (by more than a minute):
    const isUpdatedAfterView =
      updateTime > 0 &&
      createTime > 0 &&
      (updateTime - createTime > 60000) &&
      lastViewed < updateTime;

    if (isUpdatedAfterView) {
      return 'UPDATED';
    }

    return null;
  };

  // Open guide and remove badge permanently (persisting in DB & localStorage)
  const handleOpenGuide = async (guide) => {
    setSelectedGuideModal(guide);
    const now = Date.now();
    const updatedTimes = {
      ...viewedGuideTimes,
      [guide.id]: now,
    };
    setViewedGuideTimes(updatedTimes);
    try {
      localStorage.setItem(viewedTimesStorageKey, JSON.stringify(updatedTimes));
    } catch (e) {
      console.warn('Viewed storage notice:', e);
    }

    if (studentUuid) {
      try {
        await supabase.from('guide_views').upsert(
          {
            student_id: studentUuid,
            guide_id: guide.id,
            last_viewed_at: new Date(now).toISOString(),
          },
          { onConflict: 'student_id,guide_id' }
        );
      } catch {
        // Graceful fallback
      }
    }
  };

  // Format guide date matching Technical Personnel Laboratory Guides format:
  // "Published {date}    •    Updated {date}"
  const formatStudentGuideDate = (guide) => {
    return formatGuideDateDisplay(guide);
  };

  // Get clean single-line description snippet preview using shared helper
  const getGuidePreview = (guide) => {
    return getGuideSnippet(guide);
  };

  // Toggle Bookmark (persisted to saved_guides table & localStorage)
  const toggleBookmark = async (guideId, e) => {
    if (e) e.stopPropagation();
    const prevSaved = [...savedGuideIds];
    const isSaved = prevSaved.includes(guideId);
    const updated = isSaved ? prevSaved.filter((id) => id !== guideId) : [...prevSaved, guideId];

    setSavedGuideIds(updated);
    try {
      localStorage.setItem(savedStorageKey, JSON.stringify(updated));
      localStorage.setItem('fixie_student_saved_guides', JSON.stringify(updated));
    } catch {}

    window.dispatchEvent(
      new CustomEvent('fixie_saved_guides_updated', {
        detail: { count: updated.length, savedIds: updated },
      })
    );

    showToast(isSaved ? 'Guide removed from Saved.' : 'Guide saved to bookmarks!');

    if (studentUuid) {
      try {
        if (isSaved) {
          await supabase
            .from('saved_guides')
            .delete()
            .eq('guide_id', guideId)
            .eq('student_id', studentUuid);
        } else {
          await supabase
            .from('saved_guides')
            .insert([{ guide_id: guideId, student_id: studentUuid }]);
        }
      } catch (err) {
        console.warn('Bookmarks sync notice:', err.message);
      }
    }
  };

  // Compute valid saved guides that actually exist in guidesList
  const validSavedGuides = useMemo(() => {
    const existingGuideIdSet = new Set(guidesList.map((g) => g.id));
    return savedGuideIds.filter((id) => existingGuideIdSet.has(id));
  }, [guidesList, savedGuideIds]);

  // Compute live category counts directly from guidesList
  const counts = useMemo(() => {
    let rules = 0;
    let reminder = 0;
    let howTo = 0;

    guidesList.forEach((g) => {
      const cat = g.category?.toLowerCase() || '';
      if (cat === 'rules' || cat === 'rule') rules++;
      else if (cat === 'reminder' || cat === 'reminders') reminder++;
      else if (cat === 'how-to' || cat === 'howto') howTo++;
    });

    return {
      total: guidesList.length,
      rules,
      reminder,
      howTo,
      saved: validSavedGuides.length,
    };
  }, [guidesList, validSavedGuides]);

  // Filter guides based on search, category dropdown, and saved tab filter
  const filteredGuides = useMemo(() => {
    return guidesList.filter((guide) => {
      // 1. Saved filter
      if (isSavedFilterActive && !validSavedGuides.includes(guide.id)) {
        return false;
      }

      // 2. Category filter
      if (selectedCategory !== 'All') {
        const cat = guide.category?.toLowerCase() || '';
        if (selectedCategory === 'Rules' && !(cat === 'rules' || cat === 'rule')) return false;
        if (selectedCategory === 'Reminder' && !(cat === 'reminder' || cat === 'reminders')) return false;
        if (selectedCategory === 'How-to' && !(cat === 'how-to' || cat === 'howto')) return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = guide.title.toLowerCase().includes(q);
        const matchesPreview = guide.preview?.toLowerCase().includes(q);
        const matchesCategory = guide.category.toLowerCase().includes(q);
        const matchesLead = guide.leadText?.toLowerCase().includes(q);
        const matchesBullets = guide.bulletPoints?.some((b) => b.toLowerCase().includes(q));
        const matchesContent = guide.content?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesPreview && !matchesCategory && !matchesLead && !matchesBullets && !matchesContent) {
          return false;
        }
      }

      return true;
    });
  }, [guidesList, isSavedFilterActive, validSavedGuides, selectedCategory, searchQuery]);

  // Pagination calculation (strictly 5 guides per page matching Technical Personnel Laboratory Guides)
  const totalItems = filteredGuides.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedGuides = filteredGuides.slice(startIndex, startIndex + itemsPerPage);
  const displayedCount = getDisplayedCount(currentPage, itemsPerPage, totalItems);
  const visiblePages = getVisiblePages(currentPage, totalPages);

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, isSavedFilterActive]);

  // Ensure currentPage is valid if totalPages changes
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // Reset all filters, search query, dropdowns, pagination, and refresh live data from Supabase
  const handleResetFilters = async () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setIsSavedFilterActive(false);
    setIsCategoryDropdownOpen(false);
    setCurrentPage(1);
    setIsRefreshing(true);
    try {
      await Promise.all([fetchGuides(), fetchSavedGuides(studentUuid), fetchGuideViews(studentUuid)]);
    } catch (err) {
      console.warn('Guides live refresh notice:', err);
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 600);
    }
  };

  // Keyboard accessibility for modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedGuideModal) {
        setSelectedGuideModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedGuideModal]);

  // Auto-open modal if URL hash is #student-guide-modal
  useEffect(() => {
    if (window.location.hash === '#student-guide-modal' || window.location.hash === '#guide-modal') {
      const targetGuide = guidesList.find((g) => g.id === 'guide-howto-02') || guidesList[0];
      setSelectedGuideModal(targetGuide);
    }
  }, [guidesList]);

  return (
    <div className="student-guides-viewport">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="student-guides-toast" role="status" aria-live="polite">
          <Check size={16} color="#4ADE80" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. TOP HEADER BANNER (Matching Technical Personnel Hero Banner with Rings & White Card) */}
      <Banner
        title="Laboratory Resources"
        subtitle="Explore laboratory guidelines, safety reminders, and troubleshooting tips to help maintain a safe and functional learning environment."
        className="student-guides-hero-banner"
        ariaLabel="Laboratory Resources Overview"
      />

      {/* 2. STAT CARDS GRID: 4 CARDS (TOTAL GUIDES WITH GREEN BORDER, RULES, REMINDERS, HOW-TO) */}
      <div className="student-guides-stats-grid" aria-label="Laboratory Guide Stat Metrics">
        {/* Card 1: TOTAL GUIDES (Green Border & Live Count) */}
        <div
          className={`student-metric-card tech-stat-card total-guides-card card-all-guides ${selectedCategory === 'All' && !isSavedFilterActive ? 'card-filter-active' : ''}`}
          onClick={() => {
            setSelectedCategory('All');
            setIsSavedFilterActive(false);
            setCurrentPage(1);
          }}
          role="button"
          tabIndex={0}
          title="Filter by All Guides"
        >
          <div className="student-metric-header">
            <span className="student-metric-title">TOTAL GUIDES</span>
            <div className="student-metric-badge badge-active-green badge-total-guides" aria-hidden="true">
              <BookOpen size={18} strokeWidth={2.2} />
            </div>
          </div>
          <div className="student-metric-value-wrap">
            <span className="student-metric-number">{counts.total}</span>
          </div>
          <p className="student-metric-caption">Total published guides.</p>
        </div>

        {/* Card 2: RULES */}
        <div
          className={`student-metric-card tech-stat-card ${selectedCategory === 'Rules' && !isSavedFilterActive ? 'card-filter-active' : ''}`}
          onClick={() => {
            setSelectedCategory(selectedCategory === 'Rules' && !isSavedFilterActive ? 'All' : 'Rules');
            setIsSavedFilterActive(false);
            setCurrentPage(1);
          }}
          role="button"
          tabIndex={0}
          title="Filter by Rules"
        >
          <div className="student-metric-header">
            <span className="student-metric-title">RULES</span>
            <div className="student-metric-badge badge-rules-gold" aria-hidden="true">
              <FileText size={18} strokeWidth={2.2} />
            </div>
          </div>
          <div className="student-metric-value-wrap">
            <span className="student-metric-number">{counts.rules}</span>
          </div>
          <p className="student-metric-caption">Laboratory rules and conduct.</p>
        </div>

        {/* Card 3: REMINDERS */}
        <div
          className={`student-metric-card tech-stat-card ${selectedCategory === 'Reminder' && !isSavedFilterActive ? 'card-filter-active' : ''}`}
          onClick={() => {
            setSelectedCategory(selectedCategory === 'Reminder' && !isSavedFilterActive ? 'All' : 'Reminder');
            setIsSavedFilterActive(false);
            setCurrentPage(1);
          }}
          role="button"
          tabIndex={0}
          title="Filter by Reminders"
        >
          <div className="student-metric-header">
            <span className="student-metric-title">REMINDERS</span>
            <div className="student-metric-badge badge-reminders-blue" aria-hidden="true">
              <Clock size={18} strokeWidth={2.2} />
            </div>
          </div>
          <div className="student-metric-value-wrap">
            <span className="student-metric-number">{counts.reminder}</span>
          </div>
          <p className="student-metric-caption">Safety tips and reminders.</p>
        </div>

        {/* Card 4: HOW-TO */}
        <div
          className={`student-metric-card tech-stat-card ${selectedCategory === 'How-to' && !isSavedFilterActive ? 'card-filter-active' : ''}`}
          onClick={() => {
            setSelectedCategory(selectedCategory === 'How-to' && !isSavedFilterActive ? 'All' : 'How-to');
            setIsSavedFilterActive(false);
            setCurrentPage(1);
          }}
          role="button"
          tabIndex={0}
          title="Filter by How-To"
        >
          <div className="student-metric-header">
            <span className="student-metric-title">HOW-TO</span>
            <div className="student-metric-badge badge-howto-green" aria-hidden="true">
              <Wrench size={18} strokeWidth={2.2} />
            </div>
          </div>
          <div className="student-metric-value-wrap">
            <span className="student-metric-number">{counts.howTo}</span>
          </div>
          <p className="student-metric-caption">Procedures and tutorials.</p>
        </div>
      </div>

      {/* 3. SEARCH & FILTER CONTROLS BAR: Exact match to Technical Personnel -> Students page */}
      <div className="students-filter-controls-bar" aria-label="Search and Filter Guides">
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

        {/* Category Dropdown Filter */}
        <div className="students-dropdown-container" ref={categoryDropdownRef}>
          <button
            type="button"
            className="students-filter-dropdown-trigger"
            onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
            aria-expanded={isCategoryDropdownOpen}
          >
            <span>
              {selectedCategory === 'All'
                ? 'All Statuses'
                : selectedCategory === 'Reminder'
                  ? 'Reminders'
                  : selectedCategory}
            </span>
            <ChevronDown size={14} className={isCategoryDropdownOpen ? 'rotate-180' : ''} />
          </button>

          {isCategoryDropdownOpen && (
            <div className="students-filter-menu-popover" role="menu">
              {[
                { id: 'All', label: 'All Statuses' },
                { id: 'Rules', label: 'Rules' },
                { id: 'Reminder', label: 'Reminders' },
                { id: 'How-to', label: 'How-to' },
              ].map((opt) => {
                const isSelected = selectedCategory === opt.id && !isSavedFilterActive;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`dropdown-opt-btn ${isSelected ? 'selected-opt' : ''}`}
                    onClick={() => {
                      setSelectedCategory(opt.id);
                      setIsCategoryDropdownOpen(false);
                      setIsSavedFilterActive(false);
                      setCurrentPage(1);
                    }}
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

        {/* Saved Tab replacing Month filter */}
        <button
          type="button"
          className={`students-filter-dropdown-trigger student-saved-tab-trigger ${isSavedFilterActive ? 'selected-opt' : ''}`}
          onClick={() => {
            setIsSavedFilterActive((prev) => !prev);
            setCurrentPage(1);
          }}
          aria-pressed={isSavedFilterActive}
          title="Filter by Saved guides"
        >
          <span>Saved</span>
          <span className="saved-tab-badge-pill">{counts.saved}</span>
        </button>

        {/* Stationary Reset & Refresh Filters Button matching Students page */}
        <button
          type="button"
          className="students-refresh-icon-btn"
          onClick={handleResetFilters}
          title="Reset all filters"
          aria-label="Reset all filters and restore default list"
        >
          <RotateCw size={16} className={isRefreshing ? 'spin-anim' : ''} />
        </button>
      </div>

      {/* 4. SINGLE WHITE PANEL: ALL INFORMATION GUIDES */}
      <section className="tech-guides-table-card" aria-label="Laboratory Guides Directory">
        {/* Table Top Header Bar */}
        <div className="tech-guides-table-header">
          <span className="tech-guides-table-title">
            {isSavedFilterActive
              ? 'SAVED INFORMATION GUIDES'
              : selectedCategory === 'All'
                ? 'ALL INFORMATION GUIDES'
                : `${selectedCategory.toUpperCase()} INFORMATION GUIDES`}
          </span>
        </div>

        {/* List Body of Flat Rows */}
        <div className="tech-guides-list-body">
          {paginatedGuides.length === 0 ? (
            <div className="tech-guides-empty-state">
              <BookOpen size={36} className="empty-icon" />
              {isSavedFilterActive && counts.saved === 0 ? (
                <>
                  <p className="empty-text">You haven't saved any guides yet</p>
                  <p className="empty-subtext">Click the bookmark icon on any guide to save it here for quick access.</p>
                </>
              ) : (
                <>
                  <p className="empty-text">No guides found matching your filters</p>
                  <p className="empty-subtext">Try clearing your search query or changing the category filter.</p>
                </>
              )}
            </div>
          ) : (
            paginatedGuides.map((guide) => {
              const isSaved = validSavedGuides.includes(guide.id);
              const badgeStatus = getGuideBadgeStatus(guide);
              const catLower = guide.category?.toLowerCase() || '';
              const pillClass =
                catLower === 'rules' || catLower === 'rule'
                  ? 'badge-rules-pill'
                  : catLower === 'how-to' || catLower === 'howto'
                    ? 'badge-howto-pill'
                    : 'badge-reminder-pill';

              const rowClasses = [
                'tech-guide-row',
                badgeStatus === 'NEW' ? 'row-new-highlight' : '',
                badgeStatus === 'UPDATED' ? 'row-updated-highlight' : '',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <div
                  key={guide.id}
                  className={rowClasses}
                  onClick={() => handleOpenGuide(guide)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleOpenGuide(guide);
                    }
                  }}
                  title="Click to view full guide details"
                >
                  {/* Left Column: Title + Badges, Single-line preview, Date */}
                  <div className="tech-guide-row-left">
                    <div className="guide-title-row">
                      <h3 className="tech-guide-row-title">{guide.title}</h3>
                      {badgeStatus === 'UPDATED' && (
                        <span className="guide-status-tag tag-updated">UPDATED</span>
                      )}
                      {badgeStatus === 'NEW' && (
                        <span className="guide-status-tag tag-new">NEW</span>
                      )}
                    </div>
                    <p className="tech-guide-row-desc">{getGuidePreview(guide)}</p>
                    <span className="tech-guide-row-date">{formatStudentGuideDate(guide)}</span>
                  </div>

                  {/* Right Column: Category Pill Badge & Bookmark Ribbon */}
                  <div className="guide-row-right-actions">
                    <span className={`tech-guide-badge ${pillClass}`}>
                      {guide.category}
                    </span>

                    <button
                      type="button"
                      className="guide-bookmark-btn"
                      onClick={(e) => toggleBookmark(guide.id, e)}
                      title={isSaved ? 'Remove from Saved' : 'Save to bookmarks'}
                      aria-label={isSaved ? 'Remove from Saved' : 'Save to bookmarks'}
                    >
                      {isSaved ? (
                        <svg
                          width="16"
                          height="20"
                          viewBox="0 0 16 20"
                          fill="#226E38"
                          stroke="#226E38"
                          strokeWidth="1.2"
                          strokeLinejoin="round"
                        >
                          <path d="M3 2h10a1 1 0 0 1 1 1v15l-6-3.8-6 3.8V3a1 1 0 0 1 1-1z" />
                        </svg>
                      ) : (
                        <svg
                          width="16"
                          height="20"
                          viewBox="0 0 16 20"
                          fill="none"
                          stroke="#226E38"
                          strokeWidth="1.8"
                          strokeLinejoin="round"
                        >
                          <path d="M3 2h10a1 1 0 0 1 1 1v15l-6-3.8-6 3.8V3a1 1 0 0 1 1-1z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Table Footer Bar & Pagination (Strictly 5 guides per page matching Technical Personnel Laboratory Guides) */}
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

      {/* ====================================================
          IMAGE 2: GUIDE DETAILS MODAL
          Pixel-Perfect Representation of the Clicked Guide
          ==================================================== */}
      {selectedGuideModal && (
        <div
          className="guide-details-overlay"
          onClick={() => setSelectedGuideModal(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="guide-details-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Dark Forest Green Header */}
            <div className="guide-modal-header">
              <div className="guide-modal-header-top">
                {/* Category Pill */}
                <span
                  className={`guide-modal-badge ${selectedGuideModal.category?.toLowerCase() === 'rules' ||
                    selectedGuideModal.category?.toLowerCase() === 'rule'
                    ? 'modal-badge-rules'
                    : selectedGuideModal.category?.toLowerCase() === 'reminder'
                      ? 'modal-badge-reminder'
                      : 'modal-badge-howto'
                    }`}
                >
                  {selectedGuideModal.category}
                </span>

                {/* Bright Green Bookmark Ribbon on top right (only shown when bookmarked) */}
                {savedGuideIds.includes(selectedGuideModal.id) && (
                  <button
                    type="button"
                    className="guide-modal-ribbon"
                    onClick={() => toggleBookmark(selectedGuideModal.id)}
                    title="Remove bookmark"
                    aria-label="Remove bookmark"
                  >
                    <svg width="20" height="26" viewBox="0 0 24 30" fill="#22C55E">
                      <path d="M3 0h18a2 2 0 0 1 2 2v28l-11-7-11 7V2a2 2 0 0 1 2-2z" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Title */}
              <h2 className="guide-modal-title">{selectedGuideModal.title}</h2>

              {/* Date */}
              <p className="guide-modal-date">{formatGuideDateDisplay(selectedGuideModal)}</p>
            </div>

            {/* White Modal Body */}
            {/* White Modal Body with sanitized formatted HTML */}
            <div className="guide-modal-body">
              <div
                className="student-guide-rich-content"
                dangerouslySetInnerHTML={{ __html: getSanitizedGuideHtml(selectedGuideModal) }}
              />
            </div>

            {/* Modal Footer with Dark Forest Close Button */}
            <div className="guide-modal-footer">
              <button
                type="button"
                className="btn-guide-modal-close"
                onClick={() => setSelectedGuideModal(null)}
                autoFocus
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
