import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import Home from '../pages/Home.jsx';
import EventsPage from '../pages/EventsPage.jsx';
import EventRulesPage from '../pages/EventRulesPage.jsx';
import RegistrationPage from '../pages/RegistrationPage.jsx';
import Admin from '../pages/Admin.jsx';
import events from '../data/events.js';

function parseHash(hash) {
  if (!hash || hash === '#' || hash === '#/') {
    return { page: 'home', eventId: null, sectionId: null, from: null, categoryFilter: null, game: null };
  }

  const [pathPart, queryPart] = hash.split('?');
  const params = new URLSearchParams(queryPart || '');
  const fromParam = params.get('from');
  const categoryParam = params.get('category');
  const gameParam = params.get('game');
  const from = fromParam || window.history.state?.from || null;
  const categoryFilter = categoryParam || window.history.state?.categoryFilter || null;

  if (pathPart.startsWith('#/register/') || pathPart === '#/register' || pathPart.startsWith('#register')) {
    const parts = pathPart.split('/');
    const id = parts[2];
    let game = gameParam;
    if (!game && parts[3]) {
      const g = parts[3].toLowerCase();
      if (g.includes('bgmi')) game = 'BGMI';
      else if (g.includes('free') || g.includes('fire')) game = 'FREE FIRE';
    }
    const found = id ? events.find((e) => e.id === id || e.id.toLowerCase() === id?.toLowerCase()) : null;
    if (!found) {
      return { page: 'events', eventId: null, sectionId: null, from, categoryFilter, game: null };
    }
    return {
      page: 'register',
      eventId: found.id,
      sectionId: null,
      from,
      categoryFilter,
      game: game || null
    };
  }
  if (pathPart.startsWith('#/events/') || pathPart.startsWith('#/event/')) {
    const parts = pathPart.split('/');
    const id = parts[2];
    const found = events.find((e) => e.id === id || e.id.toLowerCase() === id?.toLowerCase());
    return {
      page: 'event-rules',
      eventId: found ? found.id : events[0].id,
      sectionId: null,
      from,
      categoryFilter,
      game: null
    };
  }
  if (pathPart === '#/events' || pathPart === '#events') {
    return { page: 'events', eventId: null, sectionId: null, from: null, categoryFilter: null, game: null };
  }
  if (pathPart.startsWith('#')) {
    const section = pathPart.replace(/^#\/?/, '');
    return { page: 'home', eventId: null, sectionId: section, from: null, categoryFilter: null, game: null };
  }
  return { page: 'home', eventId: null, sectionId: null, from: null, categoryFilter: null, game: null };
}

export default function AppRouter() {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  const [hasPlayedIntro, setHasPlayedIntro] = useState(false);
  const checkIsAdminOrCoordinator = () => {
    const path = window.location.pathname;
    return path.startsWith('/admin') || path.startsWith('/coordinators');
  };

  const [isAdminRoute, setIsAdminRoute] = useState(checkIsAdminOrCoordinator);

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(parseHash(window.location.hash));
    };

    // Minimal popstate listener to detect path changes for admin & coordinators
    const handlePopState = () => {
      setIsAdminRoute(checkIsAdminOrCoordinator());
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const navigateTo = (page, extra = null, options = {}) => {
    let eventId = null;
    let from = options.from || null;
    let categoryFilter = options.categoryFilter || null;
    let game = options.game || null;

    if (extra && typeof extra === 'object') {
      eventId = extra.eventId || extra.id || null;
      from = extra.from || from;
      categoryFilter = extra.categoryFilter || categoryFilter;
      game = extra.game || game;
    } else {
      eventId = extra;
    }

    if (page === 'event-rules') {
      const finalEventId = eventId || 'tech-01';
      setRoute({ page: 'event-rules', eventId: finalEventId, sectionId: null, from, categoryFilter, game: null });

      const queryParams = new URLSearchParams();
      if (from) queryParams.set('from', from);
      if (categoryFilter && categoryFilter !== 'all') queryParams.set('category', categoryFilter);
      const queryStr = queryParams.toString() ? `?${queryParams.toString()}` : '';

      try {
        window.history.pushState({ from, categoryFilter }, '', `#/events/${finalEventId}${queryStr}`);
      } catch (e) {}
      window.location.hash = `/events/${finalEventId}${queryStr}`;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (page === 'register') {
      const finalEventId = eventId || null;
      if (!finalEventId) {
        setRoute({ page: 'events', eventId: null, sectionId: null, from: null, categoryFilter: null, game: null });
        try {
          window.history.pushState({ from: null }, '', '#/events');
        } catch (e) {}
        window.location.hash = '/events';
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      setRoute({ page: 'register', eventId: finalEventId, sectionId: null, from, categoryFilter, game });

      const queryParams = new URLSearchParams();
      if (categoryFilter && categoryFilter !== 'all') queryParams.set('category', categoryFilter);
      if (game) queryParams.set('game', game);
      const queryStr = queryParams.toString() ? `?${queryParams.toString()}` : '';

      const targetHash = `/register/${finalEventId}${queryStr}`;
      try {
        window.history.pushState({ from: null, categoryFilter, game }, '', `#${targetHash}`);
      } catch (e) {}
      window.location.hash = targetHash;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (page === 'events') {
      setRoute({ page: 'events', eventId: null, sectionId: null, from: null, categoryFilter: null, game: null });
      try {
        window.history.pushState({ from: null }, '', '#/events');
      } catch (e) {}
      window.location.hash = '/events';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const sectionId = typeof extra === 'string' ? extra : null;
      setRoute({ page: 'home', eventId: null, sectionId, from: null, categoryFilter: null, game: null });
      try {
        window.history.pushState({}, '', sectionId ? `/#${sectionId}` : '#/');
      } catch (e) {}
      window.location.hash = sectionId ? `#${sectionId}` : '/';
      if (sectionId) {
        setTimeout(() => {
          document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  // If the path is /admin, render ONLY the Admin component (no Navbar/Footer)
  if (isAdminRoute) {
    return <Admin />;
  }

  return (
    <div className="app-container">
      <Navbar currentPage={route.page} onNavigate={navigateTo} />
      <main className="router-content">
        {route.page === 'event-rules' ? (
          <EventRulesPage
            eventId={route.eventId}
            from={route.from}
            categoryFilter={route.categoryFilter}
            onNavigate={navigateTo}
          />
        ) : route.page === 'register' ? (
          <RegistrationPage
            eventId={route.eventId}
            initialGame={route.game}
            initialCategoryFilter={route.categoryFilter || 'all'}
            onNavigate={navigateTo}
          />
        ) : route.page === 'events' ? (
          <EventsPage onNavigate={navigateTo} />
        ) : (
          <Home
            onNavigate={navigateTo}
            hasPlayedIntro={hasPlayedIntro}
            onIntroComplete={() => setHasPlayedIntro(true)}
          />
        )}
      </main>
      <Footer onNavigate={navigateTo} />
    </div>
  );
}

