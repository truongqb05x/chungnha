from flask import Flask, render_template, request, redirect, url_for, session, flash
import mysql.connector
from werkzeug.security import check_password_hash
from datetime import timedelta
from flask import jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from jinja2 import FileSystemLoader, Environment
import uuid  # Để tạo mã code ngẫu nhiên
app = Flask(__name__, template_folder='html')
app.secret_key = 'your_secret_key'  # Đặt secret key mạnh để bảo mật session
app.permanent_session_lifetime = timedelta(days=1)
app.config['STATIC_FOLDER'] = 'static'
app.jinja_env.loader = FileSystemLoader(['templates', 'html'])

# Đảm bảo Flask có thể phục vụ file tĩnh từ thư mục 'static'
@app.route('/static/<path:filename>')
def static_files(filename):
    return send_from_directory(app.config['STATIC_FOLDER'], filename)

def get_db_connection():
    connection = mysql.connector.connect(
        host="localhost",
        user="root",
        password="",
        database="test"
    )
    return connection
@app.route('/')
def index():
    return render_template('index.html')

# Trang home
@app.route('/home')
def trangchu():
    return render_template('home.html')

@app.route('/login', methods=['POST'])
def login():
    data = request.form
    email = data.get('email')
    password = data.get('password')
    ip_address = request.remote_addr

    print("Received login request")
    print(f"Email: {email}, Password: {password}, IP: {ip_address}")

    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
    user = cursor.fetchone()

    if user:
        print(f"User found: {user}")
        if check_password_hash(user['password_hash'], password):
            print("Password is correct")
            session.permanent = True
            session['user_id'] = user['id']
            session['full_name'] = user['full_name']

            cursor.execute("INSERT INTO login_attempts (user_id, email_attempted, ip_address, success) VALUES (%s, %s, %s, 1)",
                           (user['id'], email, ip_address))
            db.commit()
            db.close()

            return jsonify({"success": True, "message": "Đăng nhập thành công"})
        else:
            print("Password is incorrect")
    else:
        print(f"No user found with email: {email}")

    cursor.execute("INSERT INTO login_attempts (user_id, email_attempted, ip_address, success) VALUES (%s, %s, %s, 0)",
                   (None, email, ip_address))
    db.commit()
    db.close()

    return jsonify({"success": False, "message": "Email hoặc mật khẩu không đúng"}), 401
@app.route('/register', methods=['POST'])
def register():
    data = request.form
    full_name = data.get('full_name')
    email = data.get('email')
    password = data.get('password')
    password_hash = generate_password_hash(password)

    print("Received registration request")
    print(f"Full Name: {full_name}, Email: {email}, Password: {password}")

    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
    existing_user = cursor.fetchone()

    if existing_user:
        print(f"Email already registered: {email}")
        db.close()
        return jsonify({"success": False, "message": "Email đã được đăng ký"}), 409
    else:
        print(f"Registering new user: {email}")
        cursor.execute(
            "INSERT INTO users (full_name, email, password_hash) VALUES (%s, %s, %s)",
            (full_name, email, password_hash)
        )
        db.commit()
        db.close()
        return jsonify({"success": True, "message": "Đăng ký thành công"})
# --- Hàm lấy User ID từ Session ---
def get_current_user_id():
    """Lấy user_id của người dùng hiện tại từ session."""
    return session.get('user_id')

# Route để trả về thông tin thành viên
@app.route('/api/member/<int:member_id>', methods=['GET'])
def get_member(member_id):
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        # Sửa lại câu lệnh truy vấn để lấy thông tin thành viên từ bảng members, users và groups
        query = """
            SELECT m.id AS member_id, u.full_name, u.email, m.role, m.status, m.join_date, m.leave_date, m.avatar, m.created_at, m.updated_at, g.group_name
            FROM members m
            JOIN users u ON m.user_id = u.id
            JOIN groups g ON m.group_id = g.id
            WHERE m.id = %s
        """
        cursor.execute(query, (member_id,))
        member = cursor.fetchone()

        # Kiểm tra xem dữ liệu đã được lấy ra hay chưa
        print("Retrieved member data:", member)

        cursor.close()
        connection.close()

        if member:
            return jsonify(member)  # Trả về đối tượng JSON
        else:
            return jsonify({"error": "Member not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500




@app.route('/api/members', methods=['GET'])
def get_members():
    try:
        current_user_id = get_current_user_id()
        if not current_user_id:
            return jsonify({"error": "Authentication required"}), 401

        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('perPage', 5))
        search = request.args.get('search', '')
        role_filter = request.args.get('role', '')
        status_filter = request.args.get('status', '')

        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        # Lấy group_id và role của người dùng hiện tại
        user_roles_query = "SELECT group_id, role FROM members WHERE user_id = %s"
        cursor.execute(user_roles_query, (current_user_id,))
        user_memberships = cursor.fetchall()

        user_group_ids = [m['group_id'] for m in user_memberships]
        user_role_map = {m['group_id']: m['role'] for m in user_memberships}

        if not user_group_ids:
            cursor.close()
            connection.close()
            return jsonify({'members': [], 'totalMembers': 0, 'group_code': None, 'is_admin': False})

        group_filter_placeholders = ', '.join(['%s'] * len(user_group_ids))

        # Lấy group_code và group_name của nhóm đầu tiên (giả sử xem một nhóm tại một thời điểm)
        cursor.execute(
            "SELECT group_code, group_name FROM groups WHERE id = %s",
            (user_group_ids[0],)
        )
        group = cursor.fetchone()
        group_code = group['group_code'] if group else None
        group_name = group['group_name'] if group else None

        # Xác định is_admin cho nhóm đầu tiên
        is_admin = user_role_map.get(user_group_ids[0], '') == 'Admin'

        # Lấy danh sách thành viên từ tất cả nhóm của người dùng
        query = f"""
            SELECT m.id AS member_id, u.full_name, u.email, m.role, m.status,
                   g.group_name, m.group_id, LEFT(u.full_name, 1) AS initials
            FROM members m
            JOIN users u ON m.user_id = u.id
            JOIN groups g ON m.group_id = g.id
            WHERE m.group_id IN ({group_filter_placeholders})
            AND (u.full_name LIKE %s OR u.email LIKE %s)
            AND (%s = '' OR m.role = %s)
            AND (%s = '' OR m.status = %s)
            LIMIT %s OFFSET %s
        """
        search_pattern = f"%{search}%"
        offset = (page - 1) * per_page
        query_params = user_group_ids + [search_pattern, search_pattern, role_filter, role_filter, status_filter, status_filter, per_page, offset]

        cursor.execute(query, tuple(query_params))
        members = cursor.fetchall()

        # Xử lý danh sách thành viên
        processed_members = []
        for member in members:
            can_delete = user_role_map.get(member['group_id'], '') == 'Admin' and member['member_id'] != current_user_id
            processed_members.append({
                'member_id': member['member_id'],
                'full_name': member['full_name'],
                'email': member['email'],
                'role': member['role'],
                'status': member['status'],
                'group_name': member['group_name'],
                'group_id': member['group_id'],
                'initials': member['initials'],
                'can_delete': can_delete
            })

        # Đếm tổng số thành viên
        count_query = f"""
            SELECT COUNT(*) AS total
            FROM members m
            JOIN users u ON m.user_id = u.id
            JOIN groups g ON m.group_id = g.id
            WHERE m.group_id IN ({group_filter_placeholders})
            AND (u.full_name LIKE %s OR u.email LIKE %s)
            AND (%s = '' OR m.role = %s)
            AND (%s = '' OR m.status = %s)
        """
        count_query_params = user_group_ids + [search_pattern, search_pattern, role_filter, role_filter, status_filter, status_filter]
        cursor.execute(count_query, tuple(count_query_params))
        total_members = cursor.fetchone()['total']

        cursor.close()
        connection.close()

        return jsonify({
            'members': processed_members,
            'totalMembers': total_members,
            'group_code': group_code,
            'group_name': group_name,
            'is_admin': is_admin
        })
    except Exception as e:
        print(f"Error fetching members: {e}")
        return jsonify({"error": str(e)}), 500
# --- Route để xóa thành viên (Đã thêm kiểm tra quyền Admin) ---
@app.route('/api/member/<int:member_id>', methods=['DELETE'])
def delete_member(member_id):
    print(f"Attempting to delete member with ID: {member_id}")
    current_user_id = get_current_user_id()

    if not current_user_id:
        return jsonify({"error": "Authentication required"}), 401 # Chưa đăng nhập

    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        # 1. Lấy group_id và user_id của thành viên cần xóa
        cursor.execute("SELECT group_id, user_id FROM members WHERE id = %s", (member_id,))
        member_to_delete = cursor.fetchone()

        if not member_to_delete:
            # Thành viên không tồn tại
            return jsonify({"error": "Member not found"}), 404

        target_group_id = member_to_delete['group_id']
        target_user_id = member_to_delete['user_id']

        # Optional: Ngăn admin tự xóa mình khỏi nhóm
        if target_user_id == current_user_id:
             return jsonify({"error": "You cannot delete yourself from the group."}), 400 # Bad Request


        # 2. Lấy vai trò của người dùng hiện tại trong nhóm của thành viên cần xóa
        cursor.execute("SELECT role FROM members WHERE user_id = %s AND group_id = %s", (current_user_id, target_group_id))
        current_user_membership = cursor.fetchone()

        # 3. Kiểm tra xem người dùng hiện tại có tồn tại trong nhóm này và có vai trò là Admin không
        if not current_user_membership or current_user_membership['role'] != 'Admin':
            # Người dùng không đủ quyền (không phải admin trong nhóm này)
            return jsonify({"error": "Unauthorized. Only group admins can delete members."}), 403 # 403 Forbidden

        # 4. Nếu đã đủ quyền, tiến hành xóa thành viên
        delete_query = "DELETE FROM members WHERE id = %s"
        cursor.execute(delete_query, (member_id,))
        connection.commit()

        # Kiểm tra xem có bản ghi nào bị xóa không
        if cursor.rowcount == 0:
             # Điều này hiếm xảy ra nếu các kiểm tra trên đã pass,
             # có thể do racing condition hoặc lỗi khác.
             return jsonify({"error": "Member not found or already deleted."}), 404


        print(f"Successfully deleted member with ID: {member_id} (User ID: {target_user_id}) from group {target_group_id} by user {current_user_id}")
        return jsonify({"message": "Member deleted successfully"}), 200

    except Exception as e:
        print(f"Error deleting member: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()
@app.route('/api/current-user', methods=['GET'])
def get_current_user():
    try:
        current_user_id = get_current_user_id()
        if not current_user_id:
            return jsonify({"error": "Authentication required"}), 401

        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        # Lấy thông tin người dùng hiện tại
        query = """
            SELECT u.id, u.full_name, u.email, m.role, m.group_id
            FROM users u
            LEFT JOIN members m ON u.id = m.user_id
            WHERE u.id = %s
        """
        cursor.execute(query, (current_user_id,))
        user = cursor.fetchone()

        cursor.close()
        connection.close()

        if user:
            return jsonify({
                'id': user['id'],
                'full_name': user['full_name'],
                'email': user['email'],
                'role': user['role'] or 'Member'  # Mặc định là Member nếu không có role
            })
        else:
            return jsonify({"error": "User not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500
# Route tạo nhóm
@app.route('/api/group', methods=['POST'])
def create_group():
    try:
        current_user_id = get_current_user_id()
        if not current_user_id:
            return jsonify({"error": "Authentication required"}), 401

        data = request.get_json()
        group_name = data.get('group_name')
        if not group_name:
            return jsonify({"error": "Group name is required"}), 400

        # Tạo mã code duy nhất (dùng UUID hoặc chuỗi ngẫu nhiên)
        group_code = str(uuid.uuid4())[:8]  # Lấy 8 ký tự đầu của UUID

        connection = get_db_connection()
        cursor = connection.cursor()

        # Thêm nhóm vào bảng groups
        insert_group_query = """
            INSERT INTO groups (group_name, group_code, created_at, updated_at)
            VALUES (%s, %s, %s, %s)
        """
        cursor.execute(insert_group_query, (group_name, group_code, datetime.now(), datetime.now()))
        group_id = cursor.lastrowid  # Lấy ID của nhóm vừa tạo

        # Thêm người tạo nhóm làm Admin
        insert_member_query = """
            INSERT INTO members (user_id, group_id, role, status, join_date, created_at, updated_at)
            VALUES (%s, %s, 'Admin', 'Active', %s, %s, %s)
        """
        cursor.execute(insert_member_query, (current_user_id, group_id, datetime.now(), datetime.now(), datetime.now()))

        connection.commit()
        cursor.close()
        connection.close()

        return jsonify({
            "message": "Group created successfully",
            "group_id": group_id,
            "group_code": group_code
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
# 0. Lấy luôn group và member tự động
@app.route('/api/groups/my/rules', methods=['GET'])
def get_my_group_rules():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Lấy nhóm đầu tiên mà user đang Active
    cursor.execute("""
        SELECT m.group_id, m.id AS member_id
        FROM members m
        WHERE m.user_id = %s AND m.status = 'Active'
        LIMIT 1
    """, (user_id,))
    m = cursor.fetchone()
    if not m:
        cursor.close()
        conn.close()
        return jsonify({'error': 'User is not a member of any group'}), 403

    group_id  = m['group_id']
    member_id = m['member_id']

    # Lấy danh sách nội quy giống hệt logic cũ
    query = """
        SELECT r.id, r.title, r.content, r.privacy, r.like_count, r.comment_count,
               r.created_at, m.id AS member_id, u.full_name, m.avatar,
               EXISTS(SELECT 1 FROM group_rule_likes l 
                      WHERE l.rule_id = r.id AND l.member_id = %s) AS liked
        FROM group_rules r
        JOIN members m ON r.member_id = m.id
        JOIN users u ON m.user_id = u.id
        WHERE r.group_id = %s
        ORDER BY r.created_at DESC
    """
    cursor.execute(query, (member_id, group_id))
    rules = cursor.fetchall()

    cursor.close()
    conn.close()

    # Trả kèm luôn group_id + member_id để front-end có thể reuse
    return jsonify({
        'group_id': group_id,
        'member_id': member_id,
        'rules': rules
    }), 200

# 1. Lấy danh sách nội quy của nhóm (chỉ khi user là thành viên)
@app.route('/api/groups/<int:group_id>/rules', methods=['GET'])
def get_group_rules(group_id):
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    # Kiểm tra user có trong nhóm không
    cursor.execute("""
        SELECT m.id AS member_id FROM members m
        WHERE m.group_id = %s AND m.user_id = %s AND m.status = 'Active'
    """, (group_id, user_id))
    
    member = cursor.fetchone()
    if not member:
        cursor.close()
        conn.close()
        return jsonify({'error': 'User is not a member of this group'}), 403
    
    # Lấy danh sách nội quy
    query = """
        SELECT r.id, r.title, r.content, r.privacy, r.like_count, r.comment_count,
               r.created_at, m.id AS member_id, u.full_name, m.avatar,
               EXISTS(SELECT 1 FROM group_rule_likes l 
                      WHERE l.rule_id = r.id AND l.member_id = %s) AS liked
        FROM group_rules r
        JOIN members m ON r.member_id = m.id
        JOIN users u ON m.user_id = u.id
        WHERE r.group_id = %s
        ORDER BY r.created_at DESC
    """
    cursor.execute(query, (member['member_id'], group_id))
    rules = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(rules), 200

# 2. Tạo bài nội quy mới
@app.route('/api/groups/<int:group_id>/rules', methods=['POST'])
def create_group_rule(group_id):
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json()
    title = data.get('title')
    content = data.get('content')
    privacy = data.get('privacy', 'public')

    if not title or not content:
        return jsonify({'error': 'Title and content are required'}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    # Lấy member_id của user trong nhóm
    cursor.execute("""
        SELECT id FROM members 
        WHERE group_id = %s AND user_id = %s AND status = 'Active'
    """, (group_id, user_id))
    
    member = cursor.fetchone()
    if not member:
        cursor.close()
        conn.close()
        return jsonify({'error': 'User is not an active member of this group'}), 403

    # Tạo bài viết mới
    query = """
        INSERT INTO group_rules (group_id, member_id, title, content, privacy)
        VALUES (%s, %s, %s, %s, %s)
    """
    cursor.execute(query, (group_id, member['id'], title, content, privacy))
    conn.commit()
    new_id = cursor.lastrowid
    cursor.close()
    conn.close()
    return jsonify({'id': new_id}), 201
# 3. Like / Unlike bài nội quy\ n
@app.route('/api/rules/<int:rule_id>/like', methods=['POST'])
def toggle_like_rule(rule_id):
    data = request.get_json()
    member_id = data.get('member_id')
    conn = get_db_connection()
    cursor = conn.cursor()

    # Kiểm tra đã like trước đó chưa
    cursor.execute("SELECT id FROM group_rule_likes WHERE rule_id=%s AND member_id=%s", (rule_id, member_id))
    existing = cursor.fetchone()
    if existing:
        # Unlike
        cursor.execute("DELETE FROM group_rule_likes WHERE id=%s", (existing[0],))
        cursor.execute("UPDATE group_rules SET like_count = like_count - 1 WHERE id=%s", (rule_id,))
        action = 'unliked'
    else:
        cursor.execute("INSERT INTO group_rule_likes (rule_id, member_id) VALUES (%s, %s)", (rule_id, member_id))
        cursor.execute("UPDATE group_rules SET like_count = like_count + 1 WHERE id=%s", (rule_id,))
        action = 'liked'

    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'action': action}), 200

# 4. Lấy bình luận của một bài nội quy\ n
@app.route('/api/rules/<int:rule_id>/comments', methods=['GET'])
def get_rule_comments(rule_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    query = """
        SELECT c.id, c.content, c.like_count, c.created_at,
               m.id AS member_id, u.full_name, m.avatar
        FROM group_rule_comments c
        JOIN members m ON c.member_id = m.id
        JOIN users u ON m.user_id = u.id
        WHERE c.rule_id = %s
        ORDER BY c.created_at ASC
    """
    cursor.execute(query, (rule_id,))
    comments = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(comments), 200

# 5. Thêm bình luận mới\ n
@app.route('/api/rules/<int:rule_id>/comments', methods=['POST'])
def add_rule_comment(rule_id):
    data = request.get_json()
    member_id = data.get('member_id')
    content = data.get('content')
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO group_rule_comments (rule_id, member_id, content) VALUES (%s, %s, %s)",
        (rule_id, member_id, content)
    )
    cursor.execute(
        "UPDATE group_rules SET comment_count = comment_count + 1 WHERE id=%s",
        (rule_id,)
    )
    conn.commit()
    new_id = cursor.lastrowid
    cursor.close()
    conn.close()
    return jsonify({'id': new_id}), 201

# 6. Like / Unlike bình luận\ n
@app.route('/api/comments/<int:comment_id>/like', methods=['POST'])
def toggle_like_comment(comment_id):
    data = request.get_json()
    member_id = data.get('member_id')
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM group_rule_comment_likes WHERE comment_id=%s AND member_id=%s", (comment_id, member_id))
    existing = cursor.fetchone()
    if existing:
        cursor.execute("DELETE FROM group_rule_comment_likes WHERE id=%s", (existing[0],))
        cursor.execute("UPDATE group_rule_comments SET like_count = like_count - 1 WHERE id=%s", (comment_id,))
        action = 'unliked'
    else:
        cursor.execute("INSERT INTO group_rule_comment_likes (comment_id, member_id) VALUES (%s, %s)", (comment_id, member_id))
        cursor.execute("UPDATE group_rule_comments SET like_count = like_count + 1 WHERE id=%s", (comment_id,))
        action = 'liked'
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'action': action}), 200

if __name__ == '__main__':
    app.run(debug=True)
