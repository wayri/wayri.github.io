import os
import re
import shutil
import http.server
import socketserver
import datetime

def build():
    print("Building local site preview...")
    if os.path.exists('_site'):
        shutil.rmtree('_site')
    os.makedirs('_site')

    shutil.copytree('assets', '_site/assets')

    with open('_layouts/default.html', 'r', encoding='utf-8') as f:
        layout = f.read()
        
    with open('_layouts/post.html', 'r', encoding='utf-8') as f:
        post_layout = f.read()

    # Parse posts
    posts = []
    if os.path.exists('_posts'):
        for file in os.listdir('_posts'):
            if not file.endswith('.md'): continue
            with open(os.path.join('_posts', file), 'r', encoding='utf-8') as f:
                content = f.read()
            
            # extract frontmatter
            frontmatter_match = re.search(r'^---\n(.*?)\n---', content, re.DOTALL)
            frontmatter = {}
            if frontmatter_match:
                for line in frontmatter_match.group(1).split('\n'):
                    if ':' in line:
                        k, v = line.split(':', 1)
                        frontmatter[k.strip()] = v.strip()
            
            body = content[frontmatter_match.end():] if frontmatter_match else content
            title = frontmatter.get('title', file)
            category = frontmatter.get('category', 'Engineering')
            date_str = frontmatter.get('date', '2026-01-01')
            
            # format date string
            try:
                date_obj = datetime.datetime.strptime(date_str, '%Y-%m-%d')
                date_formatted = date_obj.strftime('%B %d, %Y')
            except:
                date_formatted = date_str
            
            url = f"/posts/{file.replace('.md', '.html')}"
            excerpt = body.split('\n\n')[0]
            if excerpt.startswith('#'): excerpt = body.split('\n\n')[1]
            excerpt = re.sub(r'<[^>]+>', '', excerpt)[:150] + '...'
            
            posts.append({
                'title': title,
                'category': category,
                'date': date_formatted,
                'url': url,
                'excerpt': excerpt,
                'body': body
            })
            
            # Build individual post
            post_html = post_layout.replace('{{ content }}', f"<pre style='white-space: pre-wrap; font-family: monospace; background: transparent;'>{body}</pre>")
            post_html = post_html.replace('{{ page.title }}', title)
            post_html = post_html.replace('{{ page.category | default: "Engineering Log" }}', category)
            post_html = post_html.replace('{{ page.date | date: "%B %d, %Y" }}', date_formatted)
            
            final_post = layout.replace('{{ content }}', post_html)
            final_post = re.sub(r'\{%[^%]*%\}', '', final_post)
            final_post = re.sub(r'\{\{[^\}]*\}\}', '', final_post)
            
            os.makedirs(f"_site/posts", exist_ok=True)
            with open(f"_site/posts/{file.replace('.md', '.html')}", 'w', encoding='utf-8') as f:
                f.write(final_post)

    # Process pages
    pages = ['index.html', 'blog.html', 'tools.html', 'products.html', 'pong.html']
    
    for page in pages:
        if not os.path.exists(page): continue
        with open(page, 'r', encoding='utf-8') as f:
            content = f.read()

        # Remove frontmatter
        content = re.sub(r'^---\n.*?\n---\n', '', content, flags=re.DOTALL)
        
        # If blog.html, inject posts loop
        if page == 'blog.html':
            loop_match = re.search(r'\{% for post in site\.posts %\}(.*?)\{% endfor %\}', content, re.DOTALL)
            if loop_match:
                template = loop_match.group(1)
                all_posts_html = ""
                for post in posts:
                    p_html = template
                    p_html = p_html.replace('{{ post.url | relative_url }}', post['url'])
                    p_html = p_html.replace('{{ post.category | default: "Engineering" }}', post['category'])
                    p_html = p_html.replace('{{ post.title }}', post['title'])
                    p_html = p_html.replace('{{ post.excerpt | strip_html | truncatewords: 35 }}', post['excerpt'])
                    p_html = p_html.replace('{{ post.date | date: "%B %d, %Y" }}', post['date'])
                    all_posts_html += p_html
                content = content.replace(loop_match.group(0), all_posts_html)

        html = layout.replace('{{ content }}', content)
        html = re.sub(r'\{\{.*?\}\}', '', html)
        html = re.sub(r'\{%.*?%\}', '', html)
        html = html.replace('src="assets/', 'src="/assets/')
        html = html.replace('href="assets/', 'href="/assets/')

        with open(f'_site/{page}', 'w', encoding='utf-8') as f:
            f.write(html)

    print("Site built successfully in _site/ directory.")

if __name__ == '__main__':
    build()
    PORT = 4000
    os.chdir('_site')
    Handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Serving at http://localhost:{PORT}")
        httpd.serve_forever()
