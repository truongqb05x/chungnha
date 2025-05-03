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
from datetime import date

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
# Trang thành viên
@app.route('/thanh-vien')
def thanhvien():
    return render_template('thanhvien.html')
# Trang nội quy
@app.route('/noi-quy')
def noiquy():
    return render_template('noiquy.html')
# Trang phân công việc
@app.route('/phan-cong-viec')
def phancongviec():
    return render_template('phanchiacongviec.html')
# Trang quản lý đồ dùng
@app.route('/quan-ly-do-dung')
def quanlydodung():
    return render_template('quanlyvatdung.html')
# Trang chi phí
@app.route('/chi-phi')
def chiphi():
    return render_template('chiphi.html')
# Trang quỹ nhóm
@app.route('/quy-nhom')
def quynhom():
    return render_template('quynhom.html')
# Trang thống kê
@app.route('/thong-ke')
def thongke():
    return render_template('thongke.html')
# Trang trò chuyện
@app.route('/tro-chuyen')
def trochuyen():
    return render_template('trochuyen.html')
# Trang bình chọn
@app.route('/binh-chon')
def binhchon():
    return render_template('binhchon.html')
# Trang thông báo
@app.route('/thong-bao')
def thongbao():
    return render_template('thongbao.html')
# Trang thực đơn
@app.route('/thuc-don')
def thucdon():
    return render_template('thucdon.html')
# Trang cá nhân
@app.route('/trang-ca-nhan')
def profile():
    return render_template('profile.html')
# Trang nấu ăn
@app.route('/lich-nau-an')
def lichnauan():
    return render_template('lichnauan.html')
# Trang taonhom
@app.route('/tao-nhom')
def taonhom():
    return render_template('taonhom.html')

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
from flask import session, jsonify

@app.route('/check_session', methods=['GET'])
def check_session():
    user_id = session.get('user_id')
    full_name = session.get('full_name')

    if user_id and full_name:
        return jsonify({
            "id": user_id,
            "full_name": full_name,
            "avatar": full_name[:2]  # avatar tạm lấy 2 ký tự đầu
        })
    else:
        return jsonify({"error": "Chưa đăng nhập"}), 401

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
from flask import Flask, jsonify, request
from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity
import mysql.connector
from mysql.connector import Error

from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity
# Cấu hình JWT
app.config['JWT_SECRET_KEY'] = 'your-secret-key'  # Thay bằng khóa bí mật mạnh
jwt = JWTManager(app)


# Middleware để xử lý lỗi kết nối
def handle_db_operation(query_func):
    def wrapper(*args, **kwargs):
        connection = None
        try:
            connection = get_db_connection()
            cursor = connection.cursor(dictionary=True)
            result = query_func(cursor, connection, *args, **kwargs)
            connection.commit()
            return result
        except Error as e:
            return jsonify({"error": str(e)}), 500
        finally:
            if connection and connection.is_connected():
                cursor.close()
                connection.close()
    return wrapper

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
from flask import Flask, jsonify, request
import uuid
from datetime import datetime
import logging
import numpy as np
import cv2

# Endpoint duyệt thành viên
@app.route('/api/member/<int:member_id>/approve', methods=['POST'])
def approve_member(member_id):
    try:
        # 1. Xác thực người dùng
        current_user_id = get_current_user_id()
        if not current_user_id:
            return jsonify({"error": "Authentication required"}), 401

        # 2. Kết nối database
        connection = get_db_connection()
        cursor = connection.cursor()

        # 3. Kiểm tra quyền admin
        cursor.execute(
            "SELECT id FROM members WHERE user_id = %s AND group_id = (SELECT group_id FROM members WHERE id = %s) AND role = 'Admin'",
            (current_user_id, member_id)
        )
        if not cursor.fetchone():
            cursor.close()
            connection.close()
            return jsonify({"error": "You do not have permission to approve this member"}), 403

        # 4. Kiểm tra thành viên tồn tại và đang ở trạng thái Pending
        cursor.execute(
            "SELECT status FROM members WHERE id = %s",
            (member_id,)
        )
        member = cursor.fetchone()
        if not member:
            cursor.close()
            connection.close()
            return jsonify({"error": "Member not found"}), 404
        if member[0] != 'Pending':
            cursor.close()
            connection.close()
            return jsonify({"error": "Member is not in pending status"}), 400

        # 5. Cập nhật trạng thái thành Active
        update_member_query = """
            UPDATE members
            SET status = 'Active', updated_at = %s
            WHERE id = %s
        """
        now = datetime.now()
        cursor.execute(update_member_query, (now, member_id))

        # 6. Commit và đóng kết nối
        connection.commit()
        cursor.close()
        connection.close()

        # 7. Trả về kết quả
        return jsonify({"message": "Member approved successfully"}), 200

    except Exception as e:
        logging.error(f"Error in approve_member: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500

# Endpoint từ chối thành viên
@app.route('/api/member/<int:member_id>/reject', methods=['POST'])
def reject_member(member_id):
    try:
        # 1. Xác thực người dùng
        current_user_id = get_current_user_id()
        if not current_user_id:
            return jsonify({"error": "Authentication required"}), 401

        # 2. Kết nối database
        connection = get_db_connection()
        cursor = connection.cursor()

        # 3. Kiểm tra quyền admin
        cursor.execute(
            "SELECT id FROM members WHERE user_id = %s AND group_id = (SELECT group_id FROM members WHERE id = %s) AND role = 'Admin'",
            (current_user_id, member_id)
        )
        if not cursor.fetchone():
            cursor.close()
            connection.close()
            return jsonify({"error": "You do not have permission to reject this member"}), 403

        # 4. Kiểm tra thành viên tồn tại và đang ở trạng thái Pending
        cursor.execute(
            "SELECT status FROM members WHERE id = %s",
            (member_id,)
        )
        member = cursor.fetchone()
        if not member:
            cursor.close()
            connection.close()
            return jsonify({"error": "Member not found"}), 404
        if member[0] != 'Pending':
            cursor.close()
            connection.close()
            return jsonify({"error": "Member is not in pending status"}), 400

        # 5. Xóa thành viên khỏi bảng members
        delete_member_query = """
            DELETE FROM members
            WHERE id = %s
        """
        cursor.execute(delete_member_query, (member_id,))

        # 6. Commit và đóng kết nối
        connection.commit()
        cursor.close()
        connection.close()

        # 7. Trả về kết quả
        return jsonify({"message": "Member rejected successfully"}), 200

    except Exception as e:
        logging.error(f"Error in reject_member: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500
# Cập nhật create_group để thêm random_code
@app.route('/api/group', methods=['POST'])
def create_group():
    try:
        print("Starting create_group route")
        
        # 1. Xác thực người dùng
        current_user_id = get_current_user_id()
        if not current_user_id:
            return jsonify({"error": "Authentication required"}), 401

        # 2. Lấy và kiểm tra dữ liệu đầu vào
        data = request.get_json()
        group_name = data.get('group_name')
        if not group_name:
            return jsonify({"error": "Group name is required"}), 400
        if len(group_name) > 30:
            return jsonify({"error": "Group name must not exceed 30 characters"}), 400

        # 3. Sinh mã nhóm và mã ngẫu nhiên
        group_code = str(uuid.uuid4())[:8]
        random_code = str(uuid.uuid4())[:12]  # Mã ngẫu nhiên cho QR
        print(f"Generated group code: {group_code}, random code: {random_code}")

        # 4. Tạo QR code với random_code
        qr_data = random_code
        qr = qrcode.QRCode(box_size=6, border=2)
        qr.add_data(qr_data)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")

        qr_folder = os.path.join(app.static_folder, 'qrcodes')
        os.makedirs(qr_folder, exist_ok=True)
        qr_filename = f"{group_code}.png"
        qr_path = os.path.join(qr_folder, qr_filename)
        img.save(qr_path)
        qr_image_url = f"/static/qrcodes/{qr_filename}"
        print(f"Saved QR image at: {qr_path}")

        # 5. Kết nối database và kiểm tra trùng
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute(
            "SELECT id FROM groups WHERE group_name = %s OR group_code = %s OR random_code = %s",
            (group_name, group_code, random_code)
        )
        if cursor.fetchone():
            cursor.close()
            connection.close()
            return jsonify({"error": "Group name, code or random code already exists"}), 400

        # 6. Insert nhóm (kèm qr_image_url và random_code)
        insert_group_query = """
            INSERT INTO groups
              (group_name, group_code, random_code, qr_image_url, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        now = datetime.now()
        cursor.execute(insert_group_query,
            (group_name, group_code, random_code, qr_image_url, now, now)
        )
        group_id = cursor.lastrowid

        # 7. Gán creator làm Admin
        insert_member_query = """
            INSERT INTO members
              (user_id, group_id, role, status, join_date, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        cursor.execute(insert_member_query, (
            current_user_id, group_id, 'Admin', 'Active',
            now, now, now
        ))

        # 8. Commit và đóng kết nối
        connection.commit()
        cursor.close()
        connection.close()

        # 9. Trả về kết quả
        return jsonify({
            " Monthly budget successfully reset to zero.message": "Group created successfully",
            "group": {
                "id": group_id,
                "name": group_name,
                "code": group_code,
                "qr_image_url": qr_image_url,
                "member_count": 1
            }
        }), 201

    except Exception as e:
        logging.error(f"Error in create_group: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500

# Endpoint để xử lý QR code upload (sử dụng OpenCV thay vì pyzbar)
@app.route('/api/scan-qr', methods=['POST'])
def scan_qr():
    try:
        # 1. Xác thực người dùng
        current_user_id = get_current_user_id()
        if not current_user_id:
            return jsonify({"error": "Authentication required"}), 401

        # 2. Kiểm tra file upload
        if 'qr_image' not in request.files:
            return jsonify({"error": "No QR image provided"}), 400
        
        file = request.files['qr_image']
        if not file or file.filename == '':
            return jsonify({"error": "No QR image provided"}), 400

        # 3. Đọc và phân tích QR code
        # Chuyển file thành numpy array để OpenCV xử lý
        file_bytes = np.frombuffer(file.read(), np.uint8)
        img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
        
        # Sử dụng QRCodeDetector từ OpenCV
        qr_detector = cv2.QRCodeDetector()
        data, points, _ = qr_detector.detectAndDecode(img)
        
        if not data:
            return jsonify({"error": "Could not decode QR code"}), 400

        # 4. Lấy random_code từ QR
        random_code = data

        # 5. Kết nối database
        connection = get_db_connection()
        cursor = connection.cursor()

        # 6. Tìm nhóm dựa trên random_code
        cursor.execute(
            "SELECT id, group_name, group_code FROM groups WHERE random_code = %s",
            (random_code,)
        )
        group = cursor.fetchone()
        if not group:
            cursor.close()
            connection.close()
            return jsonify({"error": "Invalid QR code"}), 404

        group_id, group_name, group_code = group

        # 7. Kiểm tra xem người dùng đã là thành viên chưa
        cursor.execute(
            "SELECT id FROM members WHERE user_id = %s AND group_id = %s",
            (current_user_id, group_id)
        )
        if cursor.fetchone():
            cursor.close()
            connection.close()
            return jsonify({"error": "You are already a member of this group"}), 400

        # 8. Đếm số thành viên hiện tại
        cursor.execute(
            "SELECT COUNT(*) FROM members WHERE group_id = %s AND status = 'Active'",
            (group_id,)
        )
        member_count = cursor.fetchone()[0]

        # 9. Đóng kết nối
        cursor.close()
        connection.close()

        # 10. Trả về thông tin nhóm
        return jsonify({
            "message": "QR code scanned successfully",
            "group": {
                "id": group_id,
                "name": group_name,
                "code": group_code,
                "member_count": member_count
            }
        }), 200

    except Exception as e:
        logging.error(f"Error in scan_qr: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500

# Giữ nguyên endpoint join_group
@app.route('/api/join-group', methods=['POST'])
def join_group():
    try:
        # 1. Xác thực người dùng
        current_user_id = get_current_user_id()
        if not current_user_id:
            return jsonify({"error": "Authentication required"}), 401

        # 2. Lấy và kiểm tra dữ liệu đầu vào
        data = request.get_json()
        group_code = data.get('group_code')
        if not group_code:
            return jsonify({"error": "Group code is required"}), 400

        # 3. Kết nối database
        connection = get_db_connection()
        cursor = connection.cursor()

        # 4. Kiểm tra mã nhóm
        cursor.execute(
            "SELECT id FROM groups WHERE group_code = %s",
            (group_code,)
        )
        group = cursor.fetchone()
        if not group:
            cursor.close()
            connection.close()
            return jsonify({"error": "Invalid group code"}), 404
        group_id = group[0]

        # 5. Kiểm tra xem người dùng đã là thành viên chưa
        cursor.execute(
            "SELECT id FROM members WHERE user_id = %s AND group_id = %s",
            (current_user_id, group_id)
        )
        if cursor.fetchone():
            cursor.close()
            connection.close()
            return jsonify({"error": "You are already a member of this group"}), 400

        # 6. Thêm người dùng vào nhóm với trạng thái Pending
        insert_member_query = """
            INSERT INTO members
              (user_id, group_id, role, status, join_date, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        now = datetime.now()
        cursor.execute(insert_member_query, (
            current_user_id, group_id, 'Member', 'Pending',
            now, now, now
        ))

        # 7. Commit và đóng kết nối
        connection.commit()
        cursor.close()
        connection.close()

        # 8. Trả về kết quả
        return jsonify({
            "message": "Successfully requested to join the group. Waiting for approval.",
            "group_id": group_id
        }), 200

    except Exception as e:
        logging.error(f"Error in join_group: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500
# Set up logging
logging.basicConfig(level=logging.DEBUG)
import os
import uuid
import qrcode
from datetime import datetime
from flask import jsonify, request
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
# Hiển thị trang bỏ phiếu
@app.route('/vote')
def vote_page():
    # Giả định user đã login và có user_id trong session
    user_id = session.get('user_id', 1)  # thay logic thực tế
    group_id = session.get('group_id', 1)

    # Lấy member_id tương ứng
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        'SELECT id FROM members WHERE user_id=%s AND group_id=%s',
        (user_id, group_id)
    )
    member_id = cursor.fetchone()[0]
    cursor.close()
    conn.close()

    return render_template('binhchon.html', group_id=group_id, member_id=member_id)

# API: đếm thành viên
@app.route('/api/group/<int:group_id>/members/count', methods=['GET'])
def get_member_count(group_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        'SELECT COUNT(*) FROM members WHERE group_id=%s AND status="Active"',
        (group_id,)
    )
    total = cursor.fetchone()[0]
    cursor.close()
    conn.close()
    return jsonify({'total_members': total})

# API: lấy mục vote
@app.route('/api/group/<int:group_id>/vote_items', methods=['GET'])
def get_vote_items(group_id):
    vote_date = request.args.get('date', date.today().isoformat())
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    # Lấy các vote_items cho group_id và vote_date
    cursor.execute(
        '''SELECT vi.id, vi.name, vi.type, vi.vote_date
           FROM vote_items vi
           WHERE vi.group_id=%s AND vi.vote_date=%s''',
        (group_id, vote_date)
    )
    items = cursor.fetchall()

    for item in items:
        # Đếm số lượng phiếu cho từng vote_item
        cursor.execute(
            'SELECT COUNT(*) AS votes FROM votes WHERE vote_item_id=%s',
            (item['id'],)
        )
        row = cursor.fetchone()
        item['votes'] = row['votes'] if row else 0

        # Lấy danh sách những người đã bầu cho vote_item
        cursor.execute(
            '''SELECT u.full_name
               FROM votes v
               JOIN members m ON v.member_id=m.id
               JOIN users u ON m.user_id=u.id
               WHERE v.vote_item_id=%s''',
            (item['id'],)
        )
        voters = cursor.fetchall()
        # Nếu có kết quả, thêm tên người bầu vào danh sách 'voters'
        item['voters'] = [voter['full_name'] for voter in voters] if voters else []

    cursor.close()
    conn.close()
    return jsonify(items)
# API: thêm mục vote
@app.route('/api/group/<int:group_id>/vote_items', methods=['POST'])
def add_vote_item(group_id):
    data = request.json
    name = data.get('name')
    type_ = data.get('type')
    vote_date = data.get('vote_date')
    member_id = data.get('member_id')
    if not all([name, type_, vote_date, member_id]):
        return jsonify({'error': 'Missing fields'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        '''INSERT INTO vote_items (group_id, member_id, name, type, vote_date)
           VALUES (%s, %s, %s, %s, %s)''',
        (group_id, member_id, name, type_, vote_date)
    )
    conn.commit()
    new_id = cursor.lastrowid
    cursor.close()
    conn.close()
    return jsonify({'id': new_id}), 201

# API: bỏ phiếu
@app.route('/api/vote', methods=['POST'])
def cast_vote():
    data = request.json
    vote_item_id = data.get('vote_item_id')
    member_id = data.get('member_id')
    if not all([vote_item_id, member_id]):
        return jsonify({'error': 'Missing fields'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            'INSERT INTO votes (vote_item_id, member_id) VALUES (%s, %s)',
            (vote_item_id, member_id)
        )
        conn.commit()
    except mysql.connector.IntegrityError:
        cursor.close()
        conn.close()
        return jsonify({'error': 'Already voted'}), 409

    cursor.close()
    conn.close()
    return jsonify({'success': True}), 201
# Item Categories Routes
@app.route('/api/categories', methods=['GET'])
def get_categories():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute('SELECT * FROM item_categories WHERE group_id = %s', (1,))  # Assuming group_id=1
    categories = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(categories)

@app.route('/api/categories', methods=['POST'])
def create_category():
    data = request.get_json()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO item_categories (group_id, name) VALUES (%s, %s)',
        (1, data['name'])  # Assuming group_id=1
    )
    conn.commit()
    category_id = cursor.lastrowid
    cursor.close()
    conn.close()
    return jsonify({'id': category_id, 'name': data['name']}), 201

# Shared Items Routes
@app.route('/api/items', methods=['GET'])
def get_items():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute('''
        SELECT si.*, ic.name as category_name
        FROM shared_items si
        LEFT JOIN item_categories ic ON si.category_id = ic.id
        WHERE si.group_id = %s AND si.is_active = 1
    ''', (1,))  # Assuming group_id=1
    items = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(items)

@app.route('/api/items', methods=['POST'])
def create_item():
    data = request.get_json()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        '''
        INSERT INTO shared_items 
        (group_id, category_id, member_id, name, description, quantity, threshold, unit, image_url)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        ''',
        (
            1,  # group_id
            data.get('category_id') or None,
            1,  # member_id
            data['name'],
            data.get('description'),
            data['quantity'],
            data['threshold'],
            data.get('unit'),
            data.get('image_url')
        )
    )
    
    # Log history
    item_id = cursor.lastrowid
    cursor.execute(
        '''
        INSERT INTO item_histories 
        (item_id, member_id, action_type, quantity_change, new_quantity, notes)
        VALUES (%s, %s, %s, %s, %s, %s)
        ''',
        (item_id, 1, 'create', data['quantity'], data['quantity'], 'Created new item')
    )
    
    conn.commit()
    cursor.close()
    conn.close()
    
    # Create notification if quantity is low
    if data['quantity'] <= data['threshold']:
        create_low_stock_notification(item_id, data['name'], data['quantity'], data['threshold'])
    
    return jsonify({'id': item_id, 'message': 'Item created'}), 201

@app.route('/api/items/<int:id>', methods=['PUT'])
def update_item(id):
    data = request.get_json()
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT quantity FROM shared_items WHERE id = %s', (id,))
    old_quantity = cursor.fetchone()[0]
    
    cursor.execute(
        '''
        UPDATE shared_items 
        SET name = %s, category_id = %s, description = %s, quantity = %s, 
            threshold = %s, unit = %s, image_url = %s, updated_at = %s
        WHERE id = %s
        ''',
        (
            data['name'],
            data.get('category_id') or None,
            data.get('description'),
            data['quantity'],
            data['threshold'],
            data.get('unit'),
            data.get('image_url'),
            datetime.now(),
            id
        )
    )
    
    # Log history
    quantity_change = data['quantity'] - old_quantity
    cursor.execute(
        '''
        INSERT INTO item_histories 
        (item_id, member_id, action_type, quantity_change, old_quantity, new_quantity, notes)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        ''',
        (id, 1, 'update', quantity_change, old_quantity, data['quantity'], 'Updated item details')
    )
    
    conn.commit()
    cursor.close()
    conn.close()
    
    # Create notification if quantity is low
    if data['quantity'] <= data['threshold']:
        create_low_stock_notification(id, data['name'], data['quantity'], data['threshold'])
    
    return jsonify({'message': 'Item updated'})

@app.route('/api/items/<int:id>', methods=['DELETE'])
def delete_item(id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('UPDATE shared_items SET is_active = 0 WHERE id = %s', (id,))
    
    # Log history
    cursor.execute(
        '''
        INSERT INTO item_histories 
        (item_id, member_id, action_type, notes)
        VALUES (%s, %s, %s, %s)
        ''',
        (id, 1, 'delete', 'Item deactivated')
    )
    
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Item deleted'})

@app.route('/api/items/<int:id>/quantity', methods=['PATCH'])
def update_item_quantity(id):
    data = request.get_json()
    change = data['change']
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT quantity, threshold, name FROM shared_items WHERE id = %s', (id,))
    item = cursor.fetchone()
    old_quantity = item[0]
    threshold = item[1]
    name = item[2]
    
    new_quantity = max(0, old_quantity + change)
    cursor.execute(
        'UPDATE shared_items SET quantity = %s WHERE id = %s',
        (new_quantity, id)
    )
    
    # Log history
    cursor.execute(
        '''
        INSERT INTO item_histories 
        (item_id, member_id, action_type, quantity_change, old_quantity, new_quantity)
        VALUES (%s, %s, %s, %s, %s, %s)
        ''',
        (id, 1, 'update', change, old_quantity, new_quantity)
    )
    
    conn.commit()
    cursor.close()
    conn.close()
    
    # Create notification if quantity is low
    if new_quantity <= threshold:
        create_low_stock_notification(id, name, new_quantity, threshold)
    
    return jsonify({'message': 'Quantity updated', 'new_quantity': new_quantity})

# Shopping List Routes
@app.route('/api/shopping-list', methods=['GET'])
def get_shopping_list():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute('''
        SELECT sl.*, si.name as item_name
        FROM shopping_lists sl
        LEFT JOIN shared_items si ON sl.item_id = si.id
        WHERE sl.group_id = %s AND sl.is_completed = 0
    ''', (1,))  # Assuming group_id=1
    items = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(items)

@app.route('/api/shopping-list', methods=['POST'])
def add_to_shopping_list():
    data = request.get_json()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        '''
        INSERT INTO shopping_lists 
        (group_id, member_id, item_id, item_name, quantity, unit, notes)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        ''',
        (
            1,  # group_id
            1,  # member_id
            data.get('item_id') or None,
            data['item_name'],
            data['quantity'],
            data.get('unit'),
            data.get('notes')
        )
    )
    conn.commit()
    item_id = cursor.lastrowid
    cursor.close()
    conn.close()
    return jsonify({'id': item_id, 'message': 'Added to shopping list'}), 201

@app.route('/api/shopping-list/<int:id>', methods=['DELETE'])
def remove_from_shopping_list(id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM shopping_lists WHERE id = %s', (id,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Item removed from shopping list'})

@app.route('/api/shopping-list/<int:id>/complete', methods=['PATCH'])
def complete_shopping_item(id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        '''
        UPDATE shopping_lists 
        SET is_completed = 1, completed_by = %s, completed_at = %s
        WHERE id = %s
        ''',
        (1, datetime.now(), id)  # Assuming member_id=1
    )
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Shopping item marked as completed'})

@app.route('/api/shopping-list/clear', methods=['DELETE'])
def clear_shopping_list():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM shopping_lists WHERE group_id = %s AND is_completed = 1', (1,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Completed shopping items cleared'})

# Helper function for notifications
def create_low_stock_notification(item_id, item_name, quantity, threshold):
    conn = get_db_connection()
    cursor = conn.cursor()
    notification_type = 'low_stock' if quantity > 0 else 'out_of_stock'
    message = f"{item_name} {'sắp hết' if quantity > 0 else 'đã hết'} (Số lượng: {quantity}/{threshold})"
    
    cursor.execute(
        '''
        INSERT INTO item_notifications 
        (group_id, item_id, member_id, notification_type, title, message)
        VALUES (%s, %s, %s, %s, %s, %s)
        ''',
        (1, item_id, 1, notification_type, f"Cảnh báo: {item_name}", message)
    )
    conn.commit()
    cursor.close()
    conn.close()

# Helper function to validate group_id and user membership
def validate_group_membership(group_id, user_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id FROM groups WHERE id = %s",
            (group_id,)
        )
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return False, "Nhóm không tồn tại"
        
        cursor.execute(
            "SELECT id FROM members WHERE group_id = %s AND user_id = %s AND status = 'Active'",
            (group_id, user_id)
        )
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return False, "Bạn không phải là thành viên của nhóm này"
        
        cursor.close()
        conn.close()
        return True, None
    except mysql.connector.Error as e:
        return False, f"Lỗi cơ sở dữ liệu: {str(e)}"

# --- Get tasks ---
@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    try:
        # Assume user_id is stored in session after authentication
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({"error": "Vui lòng đăng nhập"}), 401

        # Get group_id from query parameters
        group_id = request.args.get('group_id')
        if not group_id:
            return jsonify({"error": "Thiếu group_id"}), 400
        
        try:
            group_id = int(group_id)
        except (ValueError, TypeError):
            return jsonify({"error": "group_id không hợp lệ"}), 400

        # Validate group and membership
        is_valid, error = validate_group_membership(group_id, user_id)
        if not is_valid:
            return jsonify({"error": error}), 403

        status = request.args.get('status')      # 'completed', 'pending', 'overdue' hoặc None
        assignee = request.args.get('assignee')  # 'A','B','C' hoặc None
        from_date = request.args.get('from_date')
        to_date = request.args.get('to_date')

        # Validate input
        valid_statuses = {'completed', 'pending', 'overdue', None}
        if status not in valid_statuses:
            return jsonify({"error": "Trạng thái không hợp lệ"}), 400

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        sql = """
            SELECT 
                tasks.*, 
                users.full_name AS assignee_name
            FROM tasks
            LEFT JOIN members ON tasks.assignee_id = members.id
            LEFT JOIN users ON members.user_id = users.id
            WHERE tasks.group_id = %s
        """
        params = [group_id]

        today = date.today().isoformat()
        if status == 'completed':
            sql += " AND tasks.completed = 1"
        elif status == 'pending':
            sql += " AND tasks.completed = 0 AND tasks.due_date >= %s"
            params.append(today)
        elif status == 'overdue':
            sql += " AND tasks.completed = 0 AND tasks.due_date < %s"
            params.append(today)

        if assignee and assignee != 'all':
            sql += " AND tasks.assignee_id = (SELECT id FROM members WHERE initial = %s LIMIT 1)"
            params.append(assignee)

        if from_date:
            sql += " AND tasks.due_date >= %s"
            params.append(from_date)
        if to_date:
            sql += " AND tasks.due_date <= %s"
            params.append(to_date)

        cursor.execute(sql, params)
        tasks = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(tasks), 200
    except mysql.connector.Error as e:
        return jsonify({"error": f"Lỗi cơ sở dữ liệu: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"Lỗi hệ thống: {str(e)}"}), 500

# --- Create task ---
@app.route('/api/creat_tasks', methods=['POST'])
def create_task():
    try:
        # Assume user_id is stored in session after authentication
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({"error": "Vui lòng đăng nhập"}), 401

        data = request.get_json()
        # Bắt buộc có thêm group_id và assignee (dưới dạng ID số)
        required_fields = ['group_id', 'type', 'assignee', 'date', 'priority']
        if not data or not all(key in data for key in required_fields):
            return jsonify({"error": "Thiếu thông tin bắt buộc"}), 400

        # Validate group_id
        try:
            group_id = int(data['group_id'])
        except (ValueError, TypeError):
            return jsonify({"error": "group_id không hợp lệ"}), 400

        # Validate group and membership
        is_valid, error = validate_group_membership(group_id, user_id)
        if not is_valid:
            return jsonify({"error": error}), 403

        # Validate priority
        valid_priorities = ['low', 'medium', 'high']
        if data['priority'] not in valid_priorities:
            return jsonify({"error": "Mức độ ưu tiên không hợp lệ"}), 400

        # Chuyển assignee thành số và validate tồn tại
        try:
            assignee_id = int(data['assignee'])
        except (ValueError, TypeError):
            return jsonify({"error": "Người phụ trách không hợp lệ"}), 400

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id FROM members WHERE id = %s AND group_id = %s LIMIT 1",
            (assignee_id, group_id)
        )
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({"error": "Người phụ trách không tồn tại hoặc không thuộc nhóm"}), 400

        # Thực hiện INSERT
        cursor.execute(
            '''
            INSERT INTO tasks
                (group_id, custom_type, description, assignee_id, due_date, priority, completed)
            VALUES
                (%s, %s, %s, %s, %s, %s, 0)
            ''',
            (
                group_id,
                data['type'],
                data.get('desc'),
                assignee_id,
                data['date'],
                data['priority']
            )
        )
        conn.commit()
        new_id = cursor.lastrowid
        cursor.close()
        conn.close()

        return jsonify({"id": new_id, "message": "Tạo công việc thành công"}), 201

    except mysql.connector.Error as e:
        app.logger.error(f"DB Error: {e}")
        return jsonify({"error": f"Lỗi cơ sở dữ liệu: {str(e)}"}), 500
    except Exception as e:
        app.logger.error(f"System Error: {e}")
        return jsonify({"error": f"Lỗi hệ thống: {str(e)}"}), 500

# --- Update task ---
@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    try:
        # Assume user_id is stored in session after authentication
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({"error": "Vui lòng đăng nhập"}), 401

        data = request.get_json()
        required_fields = ['group_id', 'type', 'desc', 'assignee', 'date', 'priority']
        if not data or not all(field in data for field in required_fields):
            return jsonify({"error": "Thiếu thông tin bắt buộc"}), 400

        # Validate group_id
        try:
            group_id = int(data['group_id'])
        except (ValueError, TypeError):
            return jsonify({"error": "group_id không hợp lệ"}), 400

        # Validate group and membership
        is_valid, error = validate_group_membership(group_id, user_id)
        if not is_valid:
            return jsonify({"error": error}), 403

        # Validate priority
        valid_priorities = ['low', 'medium', 'high']
        if data['priority'] not in valid_priorities:
            return jsonify({"error": "Mức độ ưu tiên không hợp lệ"}), 400

        # Ép assignee thành số
        try:
            assignee_id = int(data['assignee'])
        except (ValueError, TypeError):
            return jsonify({"error": "Người phụ trách không hợp lệ"}), 400

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Kiểm tra task tồn tại trong nhóm
        cursor.execute(
            "SELECT id FROM tasks WHERE id = %s AND group_id = %s",
            (task_id, group_id)
        )
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({"error": "Công việc không tồn tại"}), 404

        # Kiểm tra assignee có thuộc nhóm hay không
        cursor.execute(
            "SELECT id FROM members WHERE id = %s AND group_id = %s LIMIT 1",
            (assignee_id, group_id)
        )
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({"error": "Người phụ trách không tồn tại hoặc không thuộc nhóm"}), 400

        # Thực hiện UPDATE
        cursor.execute(
            """
            UPDATE tasks
            SET
                custom_type = %s,
                description = %s,
                assignee_id = %s,
                due_date    = %s,
                priority    = %s,
                completed   = %s
            WHERE id = %s AND group_id = %s
            """,
            (
                data['type'],
                data.get('desc'),
                assignee_id,
                data['date'],
                data['priority'],
                1 if data.get('completed') else 0,
                task_id,
                group_id
            )
        )

        if cursor.rowcount == 0:
            cursor.close()
            conn.close()
            return jsonify({"error": "Không thể cập nhật công việc"}), 400

        # Lấy lại task vừa sửa để trả về
        cursor.execute(
            """
            SELECT
                t.id,
                t.custom_type    AS type,
                t.description    AS description,
                t.due_date       AS due_date,
                t.priority,
                t.completed,
                u.full_name      AS assignee_name,
                t.assignee_id
            FROM tasks t
            LEFT JOIN members m ON t.assignee_id = m.id
            LEFT JOIN users u   ON m.user_id      = u.id
            WHERE t.id = %s AND t.group_id = %s
            """,
            (task_id, group_id)
        )
        updated_task = cursor.fetchone()

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({
            "message": "Cập nhật công việc thành công",
            "task": {
                "id":            updated_task['id'],
                "type":          updated_task['type'],
                "desc":          updated_task['description'],
                "date":          str(updated_task['due_date']),
                "priority":      updated_task['priority'],
                "completed":     bool(updated_task['completed']),
                "assignee_id":   updated_task['assignee_id'],
                "assignee_name": updated_task['assignee_name']
            }
        }), 200

    except mysql.connector.Error as e:
        app.logger.error(f"DB Error: {e}")
        return jsonify({"error": f"Lỗi cơ sở dữ liệu: {str(e)}"}), 500
    except Exception as e:
        app.logger.error(f"System Error: {e}")
        return jsonify({"error": f"Lỗi hệ thống: {str(e)}"}), 500

# --- Delete task ---
@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    try:
        # Giả sử user_id được lưu trong session sau khi đăng nhập
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({"error": "Vui lòng đăng nhập"}), 401

        # Lấy group_id từ query parameters
        group_id = request.args.get('group_id')
        if not group_id:
            return jsonify({"error": "Thiếu group_id"}), 400

        try:
            group_id = int(group_id)
        except (ValueError, TypeError):
            return jsonify({"error": "group_id không hợp lệ"}), 400

        # Kiểm tra quyền thành viên trong nhóm
        is_valid, error = validate_group_membership(group_id, user_id)
        if not is_valid:
            return jsonify({"error": error}), 403

        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()

        # Kiểm tra xem task có tồn tại không
        cursor.execute(
            "SELECT id FROM tasks WHERE id = %s AND group_id = %s",
            (task_id, group_id)
        )
        result = cursor.fetchone()
        if not result:
            cursor.close()
            conn.close()
            return jsonify({"error": "Công việc không tồn tại"}), 404

        # Xóa task
        cursor.execute(
            "DELETE FROM tasks WHERE id = %s AND group_id = %s",
            (task_id, group_id)
        )

        if cursor.rowcount == 0:
            cursor.close()
            conn.close()
            return jsonify({"error": "Không thể xóa công việc"}), 400

        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"message": "Xóa công việc thành công"}), 200

    except mysql.connector.Error as e:
        return jsonify({"error": f"Lỗi cơ sở dữ liệu: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"Lỗi hệ thống: {str(e)}"}), 500

# --- Mark task as complete ---
@app.route('/api/tasks/<int:task_id>/complete', methods=['PATCH'])
def mark_complete(task_id):
    try:
        # Assume user_id is stored in session after authentication
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({"error": "Vui lòng đăng nhập"}), 401

        # Get group_id from query parameters
        group_id = request.args.get('group_id')
        if not group_id:
            return jsonify({"error": "Thiếu group_id"}), 400
        
        try:
            group_id = int(group_id)
        except (ValueError, TypeError):
            return jsonify({"error": "group_id không hợp lệ"}), 400

        # Validate group and membership
        is_valid, error = validate_group_membership(group_id, user_id)
        if not is_valid:
            return jsonify({"error": error}), 403

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE tasks SET completed = 1 WHERE id = %s AND group_id = %s",
            (task_id, group_id)
        )
        
        if cursor.rowcount == 0:
            cursor.close()
            conn.close()
            return jsonify({"error": "Công việc không tồn tại hoặc không thể cập nhật"}), 404

        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"completed": True}), 200
    except mysql.connector.Error as e:
        return jsonify({"error": f"Lỗi cơ sở dữ liệu: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"Lỗi hệ thống: {str(e)}"}), 500
# Nếu bạn đã xác định group_id trong session hay token, hãy thay thế hằng số này
GROUP_ID = 1

# --- Lấy danh sách thành viên để hiển thị tên trong <select> ---
@app.route('/api/members_exp', methods=['GET'])
def get_members_exp():
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute("""
        SELECT m.id, u.full_name
        FROM members m
        JOIN users u ON m.user_id = u.id
        WHERE m.group_id = %s
        ORDER BY u.full_name
    """, (GROUP_ID,))
    members = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(members)


# --- GET tất cả expenses ---
@app.route('/api/expenses_exp', methods=['GET'])
def get_expenses_exp():
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute("""
        SELECT
          e.id,
          e.expense_date AS date,
          e.description,
          e.amount,
          e.status,
          e.member_id AS payer_id,
          u.full_name AS payer_name
        FROM expenses e
        JOIN members m  ON e.member_id = m.id
        JOIN users u    ON m.user_id   = u.id
        WHERE e.group_id = %s
        ORDER BY e.expense_date DESC
    """, (GROUP_ID,))
    expenses = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(expenses)


# --- POST tạo mới expense ---
@app.route('/api/expenses_exp', methods=['POST'])
def create_expense_exp():
    data = request.get_json()
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO expenses
          (group_id, member_id, expense_date, description, amount, status)
        VALUES
          (%s, %s, %s, %s, %s, %s)
    """, (
        GROUP_ID,
        data['payer_id'],
        data['date'],
        data['description'],
        data['amount'],
        data['status']
    ))
    conn.commit()
    new_id = cur.lastrowid
    cur.close()
    conn.close()
    return jsonify({'id': new_id}), 201


# --- PUT cập nhật expense ---
@app.route('/api/expenses_exp/<int:exp_id>', methods=['PUT'])
def update_expense_exp(exp_id):
    data = request.get_json()
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        UPDATE expenses
        SET
          member_id    = %s,
          expense_date = %s,
          description  = %s,
          amount       = %s,
          status       = %s
        WHERE id = %s AND group_id = %s
    """, (
        data['payer_id'],
        data['date'],
        data['description'],
        data['amount'],
        data['status'],
        exp_id,
        GROUP_ID
    ))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'updated': True})


# --- DELETE xóa expense ---
@app.route('/api/expenses_exp/<int:exp_id>', methods=['DELETE'])
def delete_expense_exp(exp_id):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "DELETE FROM expenses WHERE id = %s AND group_id = %s",
        (exp_id, GROUP_ID)
    )
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'deleted': True})
GROUP_ID = 1  # hoặc lấy từ session/token

# --- Lấy danh sách members (đổ vào <select>) ---
@app.route('/api/members_sched', methods=['GET'])
def get_members_sched():
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute("""
        SELECT m.id, u.full_name
        FROM members m
        JOIN users u ON m.user_id = u.id
        WHERE m.group_id = %s
        ORDER BY u.full_name
    """, (GROUP_ID,))
    members = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(members)


# --- Lấy tất cả lịch nấu ăn ---
@app.route('/api/schedules_sched', methods=['GET'])
def get_schedules_sched():
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute("""
        SELECT
          s.id,
          s.schedule_date AS date,
          s.meal,
          s.status,
          s.member_id AS cook_id,
          u.full_name AS cook_name
        FROM cooking_schedules s
        JOIN members m  ON s.member_id = m.id
        JOIN users u    ON m.user_id   = u.id
        WHERE s.group_id = %s
        ORDER BY s.schedule_date DESC
    """, (GROUP_ID,))
    schedules = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(schedules)


# --- Tạo mới ca nấu ---
@app.route('/api/schedules_sched', methods=['POST'])
def create_schedule_sched():
    data = request.get_json()
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO cooking_schedules
          (group_id, member_id, schedule_date, meal, status)
        VALUES (%s, %s, %s, %s, %s)
    """, (
        GROUP_ID,
        data['cook_id'],
        data['date'],
        data['meal'],
        data['status']
    ))
    conn.commit()
    new_id = cur.lastrowid
    cur.close()
    conn.close()
    return jsonify({'id': new_id}), 201


# --- Cập nhật ca nấu ---
@app.route('/api/schedules_sched/<int:id>', methods=['PUT'])
def update_schedule_sched(id):
    data = request.get_json()
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        UPDATE cooking_schedules
        SET
          member_id     = %s,
          schedule_date = %s,
          meal          = %s,
          status        = %s
        WHERE id = %s AND group_id = %s
    """, (
        data['cook_id'],
        data['date'],
        data['meal'],
        data['status'],
        id,
        GROUP_ID
    ))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'updated': True})


# --- Xóa ca nấu ---
@app.route('/api/schedules_sched/<int:id>', methods=['DELETE'])
def delete_schedule_sched(id):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "DELETE FROM cooking_schedules WHERE id = %s AND group_id = %s",
        (id, GROUP_ID)
    )
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'deleted': True})


# Helper function to execute queries
def execute_query(query, params=None, fetch=True):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
        if fetch:
            result = cursor.fetchall()
            conn.commit()
            return result
        conn.commit()
        return cursor.lastrowid
    except mysql.connector.Error as err:
        print(f"Error: {err}")
        return None
    finally:
        cursor.close()
        conn.close()

# Routes for Funds
@app.route('/api/funds/<int:group_id>', methods=['GET'])
def get_funds(group_id):
    query = "SELECT * FROM funds WHERE group_id = %s"
    funds = execute_query(query, (group_id,))
    return jsonify(funds if funds else [])

@app.route('/api/funds', methods=['POST'])
def add_fund():
    data = request.json
    query = """
        INSERT INTO funds (group_id, name, amount, description, category)
        VALUES (%s, %s, %s, %s, %s)
    """
    params = (data['group_id'], data['name'], data['amount'], data['description'], data['category'])
    fund_id = execute_query(query, params, fetch=False)
    return jsonify({"id": fund_id, "message": "Fund added successfully"})

@app.route('/api/funds/<int:fund_id>', methods=['PUT'])
def update_fund(fund_id):
    data = request.json
    query = """
        UPDATE funds SET name = %s, amount = %s, description = %s, category = %s
        WHERE id = %s
    """
    params = (data['name'], data['amount'], data['description'], data['category'], fund_id)
    execute_query(query, params, fetch=False)
    return jsonify({"message": "Fund updated successfully"})

@app.route('/api/funds/<int:fund_id>', methods=['DELETE'])
def delete_fund(fund_id):
    query = "DELETE FROM funds WHERE id = %s"
    execute_query(query, (fund_id,), fetch=False)
    return jsonify({"message": "Fund deleted successfully"})

# Routes for Member Contributions
@app.route('/api/contributions/<int:fund_id>', methods=['GET'])
def get_contributions(fund_id):
    query = """
        SELECT mc.*, m.user_id, u.full_name as name, u.email
        FROM member_contributions mc
        JOIN members m ON mc.member_id = m.id
        JOIN users u ON m.user_id = u.id
        WHERE mc.fund_id = %s
    """
    contributions = execute_query(query, (fund_id,))
    return jsonify(contributions if contributions else [])

@app.route('/api/contributions', methods=['POST'])
def add_contribution():
    data = request.json
    query = """
        INSERT INTO member_contributions (member_id, fund_id, amount, period, email, phone)
        VALUES (%s, %s, %s, %s, %s, %s)
    """
    params = (data['member_id'], data['fund_id'], data['amount'], data['period'], data.get('email'), data.get('phone'))
    contribution_id = execute_query(query, params, fetch=False)
    return jsonify({"id": contribution_id, "message": "Contribution added successfully"})

@app.route('/api/contributions/<int:contribution_id>', methods=['PUT'])
def update_contribution(contribution_id):
    data = request.json
    query = """
        UPDATE member_contributions
        SET amount = %s, period = %s, paid = %s, last_paid = %s, email = %s, phone = %s
        WHERE id = %s
    """
    params = (data['amount'], data['period'], data['paid'], data.get('last_paid'), data.get('email'), data.get('phone'), contribution_id)
    execute_query(query, params, fetch=False)
    return jsonify({"message": "Contribution updated successfully"})

@app.route('/api/contributions/<int:contribution_id>/confirm', methods=['PUT'])
def confirm_contribution(contribution_id):
    data = request.json
    query = """
        UPDATE member_contributions
        SET paid = 1, last_paid = %s
        WHERE id = %s
    """
    params = (data['last_paid'], contribution_id)
    execute_query(query, params, fetch=False)
    return jsonify({"message": "Contribution confirmed successfully"})

@app.route('/api/contributions/<int:contribution_id>', methods=['DELETE'])
def delete_contribution(contribution_id):
    query = "DELETE FROM member_contributions WHERE id = %s"
    execute_query(query, (contribution_id,), fetch=False)
    return jsonify({"message": "Contribution deleted successfully"})

# Routes for Transactions
@app.route('/api/transactions/<int:fund_id>', methods=['GET'])
def get_transactions(fund_id):
    query = """
        SELECT t.*, u.full_name as member_name
        FROM transactions t
        LEFT JOIN members m ON t.member_id = m.id
        LEFT JOIN users u ON m.user_id = u.id
        WHERE t.fund_id = %s
        ORDER BY t.date DESC
    """
    transactions = execute_query(query, (fund_id,))
    return jsonify(transactions if transactions else [])

@app.route('/api/transactions', methods=['POST'])
def add_transaction():
    data = request.json
    query = """
        INSERT INTO transactions (fund_id, member_id, type, amount, date, description, category)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """
    params = (
        data['fund_id'], data.get('member_id'), data['type'], data['amount'],
        data['date'], data['description'], data['category']
    )
    transaction_id = execute_query(query, params, fetch=False)
    # Update fund balance
    update_fund_balance(data['fund_id'], data['type'], data['amount'])
    return jsonify({"id": transaction_id, "message": "Transaction added successfully"})

@app.route('/api/transactions/<int:transaction_id>', methods=['DELETE'])
def delete_transaction(transaction_id):
    # Get transaction details to adjust fund balance
    query = "SELECT fund_id, type, amount FROM transactions WHERE id = %s"
    transaction = execute_query(query, (transaction_id,))
    if transaction:
        transaction = transaction[0]
        # Reverse the balance update
        reverse_type = 'expense' if transaction['type'] == 'income' else 'income'
        update_fund_balance(transaction['fund_id'], reverse_type, transaction['amount'])
        # Delete transaction
        query = "DELETE FROM transactions WHERE id = %s"
        execute_query(query, (transaction_id,), fetch=False)
        return jsonify({"message": "Transaction deleted successfully"})
    return jsonify({"error": "Transaction not found"}), 404

# Helper function to update fund balance
def update_fund_balance(fund_id, transaction_type, amount):
    query = "SELECT amount FROM funds WHERE id = %s"
    fund = execute_query(query, (fund_id,))
    if fund:
        current_balance = fund[0]['amount']
        new_balance = current_balance + (amount if transaction_type == 'income' else -amount)
        query = "UPDATE funds SET amount = %s WHERE id = %s"
        execute_query(query, (new_balance, fund_id), fetch=False)

# Routes for Notifications
@app.route('/api/notifications/<int:group_id>', methods=['GET'])
def get_notifications(group_id):
    query = """
        SELECT n.*, u.full_name as member_name
        FROM notifications n
        JOIN members m ON n.member_id = m.id
        JOIN users u ON m.user_id = u.id
        WHERE n.group_id = %s
        ORDER BY n.created_at DESC
    """
    notifications = execute_query(query, (group_id,))
    return jsonify(notifications if notifications else [])

@app.route('/api/notifications', methods=['POST'])
def add_notification():
    data = request.json
    query = """
        INSERT INTO notifications (group_id, member_id, title, message)
        VALUES (%s, %s, %s, %s)
    """
    params = (data['group_id'], data['member_id'], data['title'], data['message'])
    notification_id = execute_query(query, params, fetch=False)
    return jsonify({"id": notification_id, "message": "Notification added successfully"})

@app.route('/api/notifications/<int:notification_id>/read', methods=['PUT'])
def mark_notification_read(notification_id):
    query = "UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE id = %s"
    execute_query(query, (notification_id,), fetch=False)
    return jsonify({"message": "Notification marked as read"})

# Tạm giả member hiện tại
CURRENT_MEMBER_ID = 1  # thay bằng session['member_id'] thật trên production

# --- Lấy danh sách tất cả thông báo cùng danh sách ai đã đọc ---
@app.route('/api/announcements', methods=['GET'])
def list_announcements():
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    # Lấy thông báo
    cur.execute("""
        SELECT
          a.id,
          a.title,
          a.content,
          a.priority,
          a.author_id,
          u.full_name AS author_name,
          a.created_at AS timestamp
        FROM announcements a
        JOIN members m ON a.author_id = m.id
        JOIN users u   ON m.user_id   = u.id
        WHERE a.group_id = %s
        ORDER BY a.created_at DESC
    """, (1,))  # giả group_id=1
    ann = cur.fetchall()
    # Lấy ai đã đọc cho mỗi thông báo
    for row in ann:
        cur.execute("""
            SELECT member_id
            FROM announcement_reads
            WHERE announcement_id = %s
        """, (row['id'],))
        row['readBy'] = [r['member_id'] for r in cur.fetchall()]
    cur.close()
    conn.close()
    return jsonify(ann)


# --- Tạo mới thông báo ---
@app.route('/api/announcements', methods=['POST'])
def create_announcement():
    data = request.get_json()
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO announcements
          (group_id, author_id, title, content, priority)
        VALUES (%s, %s, %s, %s, %s)
    """, (
        1,
        CURRENT_MEMBER_ID,
        data['title'],
        data['content'],
        data['priority']
    ))
    conn.commit()
    new_id = cur.lastrowid
    cur.close()
    conn.close()
    return jsonify({'id': new_id}), 201


# --- Đánh dấu đã đọc ---
@app.route('/api/announcements/<int:aid>/read', methods=['POST'])
def mark_read(aid):
    data = request.get_json()
    member_id = data.get('member_id', CURRENT_MEMBER_ID)
    conn = get_db_connection()
    cur = conn.cursor()
    # tránh duplicate key (khóa chính composite)
    cur.execute("""
        INSERT IGNORE INTO announcement_reads
          (announcement_id, member_id)
        VALUES (%s, %s)
    """, (aid, member_id))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'read': True})
# Route để lấy danh sách chi phí
@app.route('/api/expenses', methods=['GET'])
def get_expenses():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT 
                e.expense_date AS date,
                e.amount,
                m.user_id,
                u.full_name AS payer,
                e.description,
                CASE 
                    WHEN e.description LIKE '%thực phẩm%' THEN 'food'
                    WHEN e.description LIKE '%dụng cụ%' THEN 'utensil'
                    ELSE 'other'
                END AS type
            FROM expenses e
            JOIN members m ON e.member_id = m.id
            JOIN users u ON m.user_id = u.id
            WHERE e.status = 'Paid'
        """)
        expenses = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(expenses)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Route để lấy danh sách lịch nấu ăn
@app.route('/api/schedules', methods=['GET'])
def get_schedules():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT 
                cs.schedule_date AS date,
                cs.meal,
                m.user_id,
                u.full_name AS cook,
                (SELECT COUNT(*) 
                 FROM menu_dishes md 
                 JOIN menus mn ON md.menu_id = mn.id 
                 WHERE mn.cooking_schedule_id = cs.id) AS dishes
            FROM cooking_schedules cs
            JOIN members m ON cs.member_id = m.id
            JOIN users u ON m.user_id = u.id
            WHERE cs.status = 'Completed'
        """)
        schedules = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(schedules)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Route để lấy danh sách thực đơn và món ăn
@app.route('/api/menus', methods=['GET'])
def get_menus():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT 
                m.menu_date AS date,
                GROUP_CONCAT(md.dish_name) AS dishes
            FROM menus m
            JOIN menu_dishes md ON m.id = md.menu_id
            GROUP BY m.id, m.menu_date
        """)
        menus = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(menus)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
from functools import wraps
from flask import jsonify
from mysql.connector import Error

# Middleware để xử lý lỗi kết nối
def handle_db_operation(query_func):
    @wraps(query_func)
    def wrapper(*args, **kwargs):
        connection = None
        try:
            connection = get_db_connection()
            cursor = connection.cursor(dictionary=True)
            # query_func giờ đây nhận (cursor, connection, *args, **kwargs)
            result = query_func(cursor, connection, *args, **kwargs)
            connection.commit()
            return result
        except Error as e:
            return jsonify({"error": str(e)}), 500
        finally:
            if connection and connection.is_connected():
                cursor.close()
                connection.close()
    return wrapper

# Route: Lấy danh sách cuộc trò chuyện của người dùng
# @app.route('/api/conversations', methods=['GET'])
# @handle_db_operation
# def get_conversations(cursor, connection):
#     user_id = request.args.get('user_id', type=int)  # Giả định user_id được gửi qua query
#     if not user_id:
#         return jsonify({"error": "user_id is required"}), 400

#     query = """
#         SELECT c.id, c.is_group, c.group_id, g.group_name, n.unread_count
#         FROM conversations_chat c
#         LEFT JOIN groups g ON c.group_id = g.id
#         LEFT JOIN conversation_participants_chat cp ON c.id = cp.conversation_id
#         LEFT JOIN notifications_chat n ON c.id = n.conversation_id AND n.user_id = %s
#         WHERE cp.user_id = %s
#     """
#     cursor.execute(query, (user_id, user_id))
#     conversations = cursor.fetchall()

#     return jsonify({"conversations": conversations}), 200

# # Route: Gửi một tin nhắn mới
@app.route('/api/conversations/<int:conversation_id>/messages', methods=['POST'])
@handle_db_operation
def send_message(cursor, connection, conversation_id):
    data = request.get_json()
    sender_id = data.get('sender_id')
    content = data.get('content')

    if not sender_id or not content:
        return jsonify({"error": "sender_id and content are required"}), 400

    # Kiểm tra xem người dùng có tham gia cuộc trò chuyện không
    cursor.execute(
        "SELECT id FROM conversation_participants_chat WHERE conversation_id = %s AND user_id = %s",
        (conversation_id, sender_id)
    )
    if not cursor.fetchone():
        return jsonify({"error": "User is not a participant in this conversation"}), 403

    # Thêm tin nhắn
    query = """
        INSERT INTO messages_chat (conversation_id, sender_id, content)
        VALUES (%s, %s, %s)
    """
    cursor.execute(query, (conversation_id, sender_id, content))
    message_id = cursor.lastrowid

    # Cập nhật thông báo cho các thành viên khác
    cursor.execute(
        """
        INSERT INTO notifications_chat (user_id, conversation_id, unread_count, last_message_id)
        SELECT user_id, %s, 1, %s
        FROM conversation_participants_chat
        WHERE conversation_id = %s AND user_id != %s
        ON DUPLICATE KEY UPDATE
            unread_count = unread_count + 1,
            last_message_id = %s
        """,
        (conversation_id, message_id, conversation_id, sender_id, message_id)
    )

    return jsonify({"message_id": message_id, "content": content}), 201

# Route: Lấy danh sách tin nhắn trong một cuộc trò chuyện
@app.route('/api/conversations/<int:conversation_id>/messages', methods=['GET'])
@handle_db_operation
def get_messages(cursor, connection, conversation_id):
    user_id = request.args.get('user_id', type=int)
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    # Kiểm tra quyền truy cập
    cursor.execute(
        "SELECT id FROM conversation_participants_chat WHERE conversation_id = %s AND user_id = %s",
        (conversation_id, user_id)
    )
    if not cursor.fetchone():
        return jsonify({"error": "User is not a participant in this conversation"}), 403

    # Lấy tin nhắn
    query = """
        SELECT m.id, m.sender_id, u.full_name AS sender_name, m.content, m.is_read, m.timestamp
        FROM messages_chat m
        JOIN users u ON m.sender_id = u.id
        WHERE m.conversation_id = %s
        ORDER BY m.timestamp ASC
    """
    cursor.execute(query, (conversation_id,))
    messages = cursor.fetchall()

    # Đánh dấu tin nhắn là đã đọc
    cursor.execute(
        """
        UPDATE messages_chat
        SET is_read = 1
        WHERE conversation_id = %s AND is_read = 0
        """,
        (conversation_id,)
    )
    cursor.execute(
        """
        UPDATE notifications_chat
        SET unread_count = 0
        WHERE conversation_id = %s AND user_id = %s
        """,
        (conversation_id, user_id)
    )

    return jsonify({"messages": messages}), 200

# Route: Thêm chi phí mới
@app.route('/api/groups/<int:group_id>/expenses', methods=['POST'])
@handle_db_operation
def add_expense(cursor, connection, group_id):
    data = request.get_json()
    user_id = data.get('user_id')
    description = data.get('description')
    amount = data.get('amount')

    if not user_id or not amount:
        return jsonify({"error": "user_id and amount are required"}), 400

    # Kiểm tra xem người dùng có trong nhóm không
    cursor.execute(
        "SELECT id FROM members WHERE group_id = %s AND user_id = %s AND status = 'Active'",
        (group_id, user_id)
    )
    if not cursor.fetchone():
        return jsonify({"error": "User is not an active member of this group"}), 403

    # Thêm chi phí
    query = """
        INSERT INTO expenses_chat (group_id, user_id, description, amount)
        VALUES (%s, %s, %s, %s)
    """
    cursor.execute(query, (group_id, user_id, description, amount))
    expense_id = cursor.lastrowid

    return jsonify({"expense_id": expense_id, "description": description, "amount": amount}), 201

# Route: Tải lên tệp đính kèm
@app.route('/api/conversations/<int:conversation_id>/messages/<int:message_id>/attachments', methods=['POST'])
@handle_db_operation
def upload_attachment(cursor, connection, conversation_id, message_id):
    user_id = request.form.get('user_id', type=int)
    file = request.files.get('file')

    if not user_id or not file:
        return jsonify({"error": "user_id and file are required"}), 400

    # Kiểm tra quyền truy cập
    cursor.execute(
        """
        SELECT m.id
        FROM messages_chat m
        JOIN conversation_participants_chat cp ON m.conversation_id = cp.conversation_id
        WHERE m.id = %s AND m.conversation_id = %s AND cp.user_id = %s
        """,
        (message_id, conversation_id, user_id)
    )
    if not cursor.fetchone():
        return jsonify({"error": "Invalid message or user not in conversation"}), 403

    # Giả định tệp được lưu vào hệ thống lưu trữ (ví dụ: S3, local)
    file_url = f"/uploads/{file.filename}"  # Thay bằng logic lưu trữ thực tế
    file_type = 'image' if file.mimetype.startswith('image') else 'file'

    query = """
        INSERT INTO attachments_chat (message_id, file_type, file_url, file_name)
        VALUES (%s, %s, %s, %s)
    """
    cursor.execute(query, (message_id, file_type, file_url, file.filename))
    attachment_id = cursor.lastrowid

    return jsonify({"attachment_id": attachment_id, "file_url": file_url}), 201
# lấy tên nhóm của user
@app.route('/api/user_group', methods=['GET'])
def get_user_group():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({'error': 'User ID is required'}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # 1) Kiểm tra xem có group active hay không
    query = """
    SELECT g.group_name
      FROM groups g
      JOIN members m ON m.group_id = g.id
     WHERE m.user_id = %s
       AND m.status = 'Active'
     LIMIT 1
    """
    cursor.execute(query, (user_id,))
    group = cursor.fetchone()
    if group:
        cursor.close()
        conn.close()
        return jsonify({'group': group['group_name']}), 200

    # 2) Kiểm tra xem có membership pending hay không
    query2 = """
    SELECT 1
      FROM members
     WHERE user_id = %s
       AND status = 'Pending'
     LIMIT 1
    """
    cursor.execute(query2, (user_id,))
    pending = cursor.fetchone()
    cursor.close()
    conn.close()

    if pending:
        return jsonify({'message': 'chua_tham_gia'}), 200
    else:
        return jsonify({'message': 'chua_co_nhom'}), 404
# lấy 2 chức cái tên user
@app.route('/api/user_initials', methods=['GET'])
def get_user_initials():
    # Lấy user_id từ session
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Chưa đăng nhập'}), 401

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Lấy full_name của user
        cursor.execute("SELECT full_name FROM users WHERE id = %s", (user_id,))
        row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'User không tồn tại'}), 404

        full_name = row['full_name'].strip()
        # Tách theo khoảng trắng
        parts = full_name.split()
        if len(parts) >= 2:
            # Lấy chữ cái đầu của hai từ đầu tiên
            initials = parts[0][0] + parts[1][0]
        else:
            # Nếu chỉ có một từ, lấy hai ký tự đầu của từ đó (hoặc đủ trong phạm vi)
            initials = full_name[:2]

        initials = initials.upper()

        return jsonify({'initials': initials}), 200

    finally:
        cursor.close()
        conn.close()
@app.route('/api/unassigned-tasks', methods=['GET'])
def get_unassigned_tasks():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        sql = """
            SELECT 
                COALESCE(tt.name, t.custom_type) AS task_title
            FROM tasks t
            LEFT JOIN task_types tt ON t.type_id = tt.id
            WHERE t.group_id = %s AND t.assignee_id IS NULL
        """
        cursor.execute(sql, (GROUP_ID,))
        rows = cursor.fetchall()

        count = len(rows)
        task_titles = [row[0] for row in rows if row[0]]
        task_list = ", ".join(task_titles)

        if count == 0:
            message = "Tất cả công việc đã được phân công"
        else:
            message = f"{count} công việc chưa có người nhận: {task_list}"

        cursor.close()
        conn.close()
        return jsonify({"message": message}), 200

    except mysql.connector.Error as e:
        return jsonify({"error": f"Lỗi cơ sở dữ liệu: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"Lỗi hệ thống: {str(e)}"}), 500
# Helper function to get member info for a user in a group
def get_member_info(user_id, group_id):
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT m.id AS member_id, m.group_id
            FROM members m
            WHERE m.user_id = %s AND m.group_id = %s AND m.status = 'Active'
        """, (user_id, group_id))
        member = cursor.fetchone()
        cursor.close()
        connection.close()
        return member
    except Exception as e:
        return None

# API: Lấy danh sách nhóm của người dùng
@app.route('/user_groups_api', methods=['GET'])
def get_user_groups_api():
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Người dùng chưa đăng nhập'}), 401
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT m.group_id, g.group_name
            FROM members m
            JOIN groups g ON m.group_id = g.id
            WHERE m.user_id = %s AND m.status = 'Active'
        """, (user_id,))
        groups = cursor.fetchall()
        cursor.close()
        connection.close()
        return jsonify(groups)
    except Exception as e:
        return jsonify({'error': f'Lỗi khi lấy danh sách nhóm: {str(e)}'}), 500

# API: Lấy danh sách thực đơn
@app.route('/menus_api', methods=['GET'])
def get_menus_api():
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Người dùng chưa đăng nhập'}), 401

        group_id = int(request.args.get('group_id', 0))
        if group_id == 0:
            return jsonify({'error': 'Thiếu hoặc không hợp lệ group_id'}), 400

        member = get_member_info(user_id, group_id)
        if not member:
            return jsonify({'error': 'Người dùng không phải là thành viên hoạt động của nhóm này'}), 403

        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Lấy tham số lọc và phân trang
        status = request.args.get('status', '')
        date = request.args.get('date', '')
        search = request.args.get('search', '')
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 5))
        sort_column = request.args.get('sort_column', 'menu_date')
        sort_direction = request.args.get('sort_direction', 'asc')
        
        # Xây dựng truy vấn
        query = """
            SELECT 
                m.id,
                m.menu_date,
                m.status,
                m.notes,
                GROUP_CONCAT(DISTINCT md.dish_name SEPARATOR '\n') AS dishes,
                GROUP_CONCAT(DISTINCT u.full_name SEPARATOR ', ') AS cooks
            FROM menus m
            LEFT JOIN menu_dishes md ON m.id = md.menu_id
            LEFT JOIN menu_cooks mc ON m.id = mc.menu_id
            LEFT JOIN members me ON mc.member_id = me.id
            LEFT JOIN users u ON me.user_id = u.id
            WHERE m.group_id = %s
        """
        params = [group_id]
        
        # Áp dụng bộ lọc
        if status:
            query += " AND m.status = %s"
            params.append(status)
        if date:
            query += " AND m.menu_date = %s"
            params.append(date)
        if search:
            query += " AND (md.dish_name LIKE %s OR u.full_name LIKE %s)"
            params.extend([f'%{search}%', f'%{search}%'])
        
        query += " GROUP BY m.id"
        
        # Áp dụng sắp xếp
        if sort_column in ['menu_date', 'status']:
            query += f" ORDER BY m.{sort_column} {sort_direction}"
        elif sort_column == 'dishes':
            query += f" ORDER BY dishes {sort_direction}"
        elif sort_column == 'cooks':
            query += f" ORDER BY cooks {sort_direction}"
        
        # Áp dụng phân trang
        offset = (page - 1) * per_page
        query += " LIMIT %s OFFSET %s"
        params.extend([per_page, offset])
        
        cursor.execute(query, params)
        menus = cursor.fetchall()
        
        # Đếm tổng số bản ghi để phân trang
        count_query = """
            SELECT COUNT(DISTINCT m.id)
            FROM menus m
            LEFT JOIN menu_dishes md ON m.id = md.menu_id
            LEFT JOIN menu_cooks mc ON m.id = mc.menu_id
            LEFT JOIN members me ON mc.member_id = me.id
            LEFT JOIN users u ON me.user_id = u.id
            WHERE m.group_id = %s
        """
        count_params = [group_id]
        if status:
            count_query += " AND m.status = %s"
            count_params.append(status)
        if date:
            count_query += " AND m.menu_date = %s"
            count_params.append(date)
        if search:
            count_query += " AND (md.dish_name LIKE %s OR u.full_name LIKE %s)"
            count_params.extend([f'%{search}%', f'%{search}%'])
        
        cursor.execute(count_query, count_params)
        total = cursor.fetchone()['COUNT(DISTINCT m.id)']
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'menus': menus,
            'total': total,
            'page': page,
            'per_page': per_page
        })
    except Exception as e:
        return jsonify({'error': f'Lỗi khi lấy danh sách thực đơn: {str(e)}'}), 500

# API: Lấy chi tiết thực đơn
@app.route('/menu_api/<int:id>', methods=['GET'])
def get_menu_api(id):
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Người dùng chưa đăng nhập'}), 401

        group_id = int(request.args.get('group_id', 0))
        if group_id == 0:
            return jsonify({'error': 'Thiếu hoặc không hợp lệ group_id'}), 400

        member = get_member_info(user_id, group_id)
        if not member:
            return jsonify({'error': 'Người dùng không phải là thành viên hoạt động của nhóm này'}), 403

        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Lấy thông tin thực đơn
        cursor.execute("""
            SELECT 
                m.id,
                m.menu_date,
                m.status,
                m.notes,
                GROUP_CONCAT(DISTINCT md.dish_name SEPARATOR '\n') AS dishes,
                GROUP_CONCAT(DISTINCT u.full_name SEPARATOR ', ') AS cooks
            FROM menus m
            LEFT JOIN menu_dishes md ON m.id = md.menu_id
            LEFT JOIN menu_cooks mc ON m.id = mc.menu_id
            LEFT JOIN members me ON mc.member_id = me.id
            LEFT JOIN users u ON me.user_id = u.id
            WHERE m.id = %s AND m.group_id = %s
            GROUP BY m.id
        """, (id, group_id))
        menu = cursor.fetchone()
        
        cursor.close()
        connection.close()
        
        if not menu:
            return jsonify({'error': 'Không tìm thấy thực đơn'}), 404
        
        return jsonify(menu)
    except Exception as e:
        return jsonify({'error': f'Lỗi khi lấy chi tiết thực đơn: {str(e)}'}), 500

# API: Thêm thực đơn
@app.route('/menu_api', methods=['POST'])
def add_menu_api():
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Người dùng chưa đăng nhập'}), 401

        data = request.json
        group_id = data.get('group_id')
        if not group_id:
            return jsonify({'error': 'Thiếu group_id trong dữ liệu gửi lên'}), 400

        member = get_member_info(user_id, group_id)
        if not member:
            return jsonify({'error': 'Người dùng không phải là thành viên hoạt động của nhóm này'}), 403

        menu_date = data.get('menu_date')
        dishes = data.get('dishes', '').split('\n')
        cooks = data.get('cooks', '').split(', ')
        status = data.get('status', 'Preparing')
        notes = data.get('notes', '')
        
        connection = get_db_connection()
        cursor = connection.cursor()
        
        # Thêm thực đơn
        cursor.execute("""
            INSERT INTO menus (group_id, member_id, menu_date, status, notes)
            VALUES (%s, %s, %s, %s, %s)
        """, (group_id, member['member_id'], menu_date, status, notes))
        menu_id = cursor.lastrowid
        
        # Thêm món ăn
        for dish in dishes:
            if dish.strip():
                cursor.execute("""
                    INSERT INTO menu_dishes (menu_id, dish_name)
                    VALUES (%s, %s)
                """, (menu_id, dish.strip()))
        
        # Thêm người nấu
        for cook in cooks:
            if cook.strip():
                cursor.execute("""
                    INSERT INTO menu_cooks (menu_id, member_id)
                    SELECT %s, m.id
                    FROM members m
                    JOIN users u ON m.user_id = u.id
                    WHERE u.full_name = %s AND m.group_id = %s
                """, (menu_id, cook.strip(), group_id))
        
        connection.commit()
        cursor.close()
        connection.close()
        
        return jsonify({'message': 'Thêm thực đơn thành công', 'id': menu_id}), 201
    except Exception as e:
        return jsonify({'error': f'Lỗi khi thêm thực đơn: {str(e)}'}), 500

# API: Sửa thực đơn
@app.route('/menu_api/<int:id>', methods=['PUT'])
def update_menu_api(id):
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Người dùng chưa đăng nhập'}), 401

        data = request.json
        group_id = data.get('group_id')
        if not group_id:
            return jsonify({'error': 'Thiếu group_id trong dữ liệu gửi lên'}), 400

        member = get_member_info(user_id, group_id)
        if not member:
            return jsonify({'error': 'Người dùng không phải là thành viên hoạt động của nhóm này'}), 403

        menu_date = data.get('menu_date')
        dishes = data.get('dishes', '').split('\n')
        cooks = data.get('cooks', '').split(', ')
        status = data.get('status')
        notes = data.get('notes', '')
        
        connection = get_db_connection()
        cursor = connection.cursor()
        
        # Cập nhật thông tin thực đơn
        cursor.execute("""
            UPDATE menus
            SET menu_date = %s, status = %s, notes = %s
            WHERE id = %s AND group_id = %s
        """, (menu_date, status, notes, id, group_id))
        
        if cursor.rowcount == 0:
            cursor.close()
            connection.close()
            return jsonify({'error': 'Không tìm thấy thực đơn'}), 404
        
        # Xóa món ăn cũ
        cursor.execute("DELETE FROM menu_dishes WHERE menu_id = %s", (id,))
        
        # Thêm món ăn mới
        for dish in dishes:
            if dish.strip():
                cursor.execute("""
                    INSERT INTO menu_dishes (menu_id, dish_name)
                    VALUES (%s, %s)
                """, (id, dish.strip()))
        
        # Xóa người nấu cũ
        cursor.execute("DELETE FROM menu_cooks WHERE menu_id = %s", (id,))
        
        # Thêm người nấu mới
        for cook in cooks:
            if cook.strip():
                cursor.execute("""
                    INSERT INTO menu_cooks (menu_id, member_id)
                    SELECT %s, m.id
                    FROM members m
                    JOIN users u ON m.user_id = u.id
                    WHERE u.full_name = %s AND m.group_id = %s
                """, (id, cook.strip(), group_id))
        
        connection.commit()
        cursor.close()
        connection.close()
        
        return jsonify({'message': 'Cập nhật thực đơn thành công'})
    except Exception as e:
        return jsonify({'error': f'Lỗi khi cập nhật thực đơn: {str(e)}'}), 500

# API: Xóa thực đơn
@app.route('/menu_api/<int:id>', methods=['DELETE'])
def delete_menu_api(id):
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Người dùng chưa đăng nhập'}), 401

        group_id = int(request.args.get('group_id', 0))
        if group_id == 0:
            return jsonify({'error': 'Thiếu hoặc không hợp lệ group_id'}), 400

        member = get_member_info(user_id, group_id)
        if not member:
            return jsonify({'error': 'Người dùng không phải là thành viên hoạt động của nhóm này'}), 403

        connection = get_db_connection()
        cursor = connection.cursor()
        
        cursor.execute("DELETE FROM menus WHERE id = %s AND group_id = %s", (id, group_id))
        
        if cursor.rowcount == 0:
            cursor.close()
            connection.close()
            return jsonify({'error': 'Không tìm thấy thực đơn'}), 404
        
        connection.commit()
        cursor.close()
        connection.close()
        
        return jsonify({'message': 'Xóa thực đơn thành công'})
    except Exception as e:
        return jsonify({'error': f'Lỗi khi xóa thực đơn: {str(e)}'}), 500
 # Middleware kiểm tra xác thực
def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({"error": "Authentication required"}), 401
        request.user_id = user_id
        return f(*args, **kwargs)
    return decorated

# Endpoint lấy danh sách cuộc trò chuyện nhóm và thành viên
@app.route('/api/conversations', methods=['GET'])
@require_auth
def get_conversations():
    try:
        user_id = request.user_id
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        # Truy vấn lấy danh sách cuộc trò chuyện nhóm
        query = """
            SELECT 
                c.id, c.is_group, c.group_id, g.group_name,
                n.unread_count, COALESCE(n.is_muted, 0) AS is_muted,
                m.id AS last_message_id, m.content AS last_message_content,
                m.timestamp AS last_message_timestamp, u.full_name AS last_message_sender_name
            FROM conversations_chat c
            LEFT JOIN groups g ON c.group_id = g.id
            JOIN conversation_participants_chat cp ON c.id = cp.conversation_id
            LEFT JOIN notifications_chat n ON c.id = n.conversation_id AND n.user_id = %s
            LEFT JOIN messages_chat m ON c.id = m.conversation_id
            LEFT JOIN users u ON m.sender_id = u.id
            WHERE cp.user_id = %s AND c.is_group = 1
            ORDER BY m.timestamp DESC
        """
        cursor.execute(query, (user_id, user_id))
        conversations = cursor.fetchall()
        logging.info(f"[get_conversations] Found {len(conversations)} group conversations for user_id={user_id}")

        result = []
        for conv in conversations:
            # Lấy danh sách thành viên của nhóm từ bảng members
            cursor.execute("""
                SELECT u.id, u.full_name, m.role, m.status
                FROM members m
                JOIN users u ON m.user_id = u.id
                WHERE m.group_id = %s
            """, (conv['group_id'],))
            members = cursor.fetchall()

            conversation_data = {
                "id": conv['id'],
                "is_group": bool(conv['is_group']),
                "group_id": conv['group_id'],
                "group_name": conv['group_name'],
                "members": [
                    {
                        "id": m['id'],
                        "full_name": m['full_name'],
                        "avatar": m['full_name'][:2],  # Avatar mặc định từ full_name
                        "role": m['role'],
                        "status": m['status']
                    } for m in members
                ],
                "unread_count": conv['unread_count'] or 0,
                "is_muted": bool(conv['is_muted']) if conv['is_muted'] is not None else False,
                "last_message": None
            }

            if conv['last_message_id']:
                conversation_data["last_message"] = {
                    "id": conv['last_message_id'],
                    "content": conv['last_message_content'],
                    "timestamp": conv['last_message_timestamp'].isoformat(),
                    "sender_name": conv['last_message_sender_name']
                }

            result.append(conversation_data)

        cursor.close()
        connection.close()

        logging.info(f"[get_conversations] Returning {len(result)} group conversations: {result}")
        return jsonify({"conversations": result}), 200

    except mysql.connector.Error as e:
        logging.error(f"SQL Error in get_conversations: {e}", exc_info=True)
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        logging.error(f"Error in get_conversations: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500

# Endpoint lấy danh sách thành viên trong nhóm
@app.route('/api/groups/<int:group_id>/members', methods=['GET'])
@require_auth
def get_group_members(group_id):
    try:
        user_id = request.user_id
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            "SELECT id FROM members WHERE user_id = %s AND group_id = %s",
            (user_id, group_id)
        )
        if not cursor.fetchone():
            cursor.close()
            connection.close()
            return jsonify({"error": "You are not a member of this group"}), 403

        cursor.execute("""
            SELECT u.id, u.full_name, m.role, m.status
            FROM members m
            JOIN users u ON m.user_id = u.id
            WHERE m.group_id = %s
        """, (group_id,))
        members = cursor.fetchall()

        # Thêm avatar mặc định dựa trên full_name
        for member in members:
            member['avatar'] = member['full_name'][:2]

        cursor.close()
        connection.close()

        return jsonify({"members": members}), 200

    except mysql.connector.Error as e:
        logging.error(f"SQL Error in get_group_members: {e}", exc_info=True)
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        logging.error(f"Error in get_group_members: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500
if __name__ == '__main__':
    app.run(debug=True)
