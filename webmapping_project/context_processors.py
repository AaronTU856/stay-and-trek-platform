# webmapping_project/context_processors.py
def navigation_context(request):
    """
    Add navigation data to all templates.
    Maps URL names to display information.
    """
    
    # Map current URL to page identifier
    current_page = None
    path = request.path
    
    if path.startswith('/api/trails/map'):
        current_page = 'trails'
    elif path.startswith('/dashboard'):
        current_page = 'dashboard'
    elif path.startswith('/advanced-js-mapping/map'):
        current_page = 'interactive_map'
    elif path.startswith('/advanced-js-mapping/') and 'analytics' in path:
        current_page = 'analytics'
    elif path.startswith('/advanced-js-mapping'):
        current_page = 'polygon_search'
    elif path.startswith('/admin'):
        current_page = 'admin'
    else:
        current_page = 'home'
    
    # Navigation items - order matters for display
    navigation_items = [
        {
            'name': '🥾 Trails in Ireland',
            'url': 'trails:map',
            'id': 'trails',
            'color': 'var(--brand-primary,#2E8B57)'
        },
        {
            'name': '📊 Dashboard',
            'url': '/dashboard/',
            'id': 'dashboard',
            'color': '#8B4513'
        },
        {
            'name': '🗺️ Interactive Map',
            'url': 'advanced_js_mapping:map',
            'id': 'interactive_map',
            'color': '#2E27F5'
        },
        {
            'name': '🏨 Accommodations',
            'url': 'advanced_js_mapping:index',
            'id': 'polygon_search',
            'color': '#F5273F'
        },
        {
            'name': '📈 Analytics',
            'url': 'advanced_js_mapping:analytics',
            'id': 'analytics',
            'color': '#FFB86B'
        },
        {
            'name': '⚙️ Admin',
            'url': '/admin/',
            'id': 'admin',
            'color': '#34495E'
        },
    ]
    
    return {
        'current_page': current_page,
        'navigation_items': navigation_items,
    }
