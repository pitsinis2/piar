// Extracted from index_v2_mobile.html on 2026-05-01.
document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('.mobile-bottom-nav button')
      .forEach(btn => {
        btn.addEventListener('click', () => {
          const map = {
            projects: 'projects',
            clients: 'clients',
            planner: 'planner',
            team: 'teams',
            settings: 'theme'
          };

          const view = map[btn.dataset.nav];
          const target = document.querySelector(`.bookmark-link[data-view="${view}"]`);

          if (target) target.click();
          else console.error('bookmark-link NOT FOUND for view:', view);
        });
      });
    });

