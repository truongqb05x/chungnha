# ======================= #
#     IMPORT MODULES     #
# ======================= #
import os
import uuid
import logging
from datetime import date, datetime, timedelta
from functools import wraps
import qrcode
import numpy as np
import cv2
import mysql.connector
from mysql.connector import Error
from flask import (
    Flask, render_template, request, redirect, url_for,
    session, flash, jsonify, send_from_directory
)
from flask_jwt_extended import (
    JWTManager, jwt_required,
    create_access_token, get_jwt_identity
)
from werkzeug.security import generate_password_hash, check_password_hash
from jinja2 import FileSystemLoader

# ======================= #
#     FLASK CONFIG        #
# ======================= #
app = Flask(
    __name__,
    template_folder='html',     # Thư mục chứa các file giao diện HTML
    static_folder='static'      # Thư mục chứa các file tĩnh (CSS, JS, ảnh...)
)
app.secret_key = 'your_secret_key'  # Khóa bí mật dùng để mã hóa session
app.permanent_session_lifetime = timedelta(days=1)  # Thời gian sống của session

# Cho phép Flask tìm template từ nhiều thư mục
app.jinja_env.loader = FileSystemLoader(['templates', 'html'])

# ======================= #
#      LOGGING & JWT      #
# ======================= #
logging.basicConfig(level=logging.DEBUG)  # Thiết lập cấp độ log
jwt = JWTManager(app)                     # Khởi tạo JWT

# ============================= #
#      STATIC FILE HANDLER     #
# ============================= #
# Cho phép phục vụ các file tĩnh như ảnh, CSS, JS từ đường dẫn /static/...
@app.route('/static/<path:filename>')
def static_files(filename):
    return send_from_directory(app.config['STATIC_FOLDER'], filename)

# ============================= #
#     DATABASE CONNECTION       #
# ============================= #
def get_db_connection():
    """Tạo kết nối đến cơ sở dữ liệu MySQL"""
    connection = mysql.connector.connect(
        host="localhost",
        user="root",
        password="",
        database="test"
    )
    return connection

# ============================= #
#        ROUTING PAGES         #
# ============================= #

# Trang chính (landing page)
@app.route('/')
def index():
    return render_template('index.html')

# Trang chủ
@app.route('/home')
def trangchu():
    return render_template('home.html')

# Trang thông tin thành viên
@app.route('/thanh-vien')
def thanhvien():
    return render_template('thanhvien.html')

# Trang nội quy của nhóm
@app.route('/noi-quy')
def noiquy():
    return render_template('noiquy.html')

# Trang phân chia công việc
@app.route('/phan-cong-viec')
def phancongviec():
    return render_template('phanchiacongviec.html')

# Trang quản lý vật dụng chung
@app.route('/quan-ly-do-dung')
def quanlydodung():
    return render_template('quanlyvatdung.html')

# Trang quản lý chi phí
@app.route('/chi-phi')
def chiphi():
    return render_template('chiphi.html')

# Trang thông tin quỹ nhóm
@app.route('/quy-nhom')
def quynhom():
    return render_template('quynhom.html')

# Trang thống kê tổng hợp
@app.route('/thong-ke')
def thongke():
    return render_template('thongke.html')

# Trang trò chuyện nhóm
@app.route('/tro-chuyen')
def trochuyen():
    return render_template('trochuyen.html')

# Trang bình chọn ý kiến
@app.route('/binh-chon')
def binhchon():
    return render_template('binhchon.html')

# Trang thông báo nội bộ
@app.route('/thong-bao')
def thongbao():
    return render_template('thongbao.html')

# Trang thực đơn nấu ăn
@app.route('/thuc-don')
def thucdon():
    return render_template('thucdon.html')

# Trang cá nhân người dùng
@app.route('/trang-ca-nhan')
def profile():
    return render_template('profile.html')

# Trang lịch nấu ăn
@app.route('/lich-nau-an')
def lichnauan():
    return render_template('lichnauan.html')

# Trang tạo nhóm mới
@app.route('/tao-nhom')
def taonhom():
    return render_template('taonhom.html')
# ============================= #
#        ROUTING AUTH          #
# ============================= #

# API xử lý đăng nhập người dùng
@app.route('/login', methods=['POST'])
def login():
    # Lấy dữ liệu từ form gửi lên
    data = request.form
    email = data.get('email')
    password = data.get('password')
    ip_address = request.remote_addr  # Lấy địa chỉ IP của client

    # Log thông tin đăng nhập (dùng cho debug)
    print("Received login request")
    print(f"Email: {email}, Password: {password}, IP: {ip_address}")

    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    # Tìm người dùng theo email
    cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
    user = cursor.fetchone()

    if user:
        print(f"User found: {user}")
        # Kiểm tra mật khẩu đúng không
        if check_password_hash(user['password_hash'], password):
            print("Password is correct")
            # Lưu thông tin user vào session
            session.permanent = True
            session['user_id'] = user['id']
            session['full_name'] = user['full_name']

            # Ghi nhận lần đăng nhập thành công
            cursor.execute("""
                INSERT INTO login_attempts (user_id, email_attempted, ip_address, success)
                VALUES (%s, %s, %s, 1)
            """, (user['id'], email, ip_address))
            db.commit()
            db.close()

            return jsonify({"success": True, "message": "Đăng nhập thành công"})
        else:
            print("Password is incorrect")
    else:
        print(f"No user found with email: {email}")

    # Ghi nhận lần đăng nhập thất bại
    cursor.execute("""
        INSERT INTO login_attempts (user_id, email_attempted, ip_address, success)
        VALUES (%s, %s, %s, 0)
    """, (None, email, ip_address))
    db.commit()
    db.close()

    return jsonify({"success": False, "message": "Email hoặc mật khẩu không đúng"}), 401


# API xử lý đăng xuất người dùng
@app.route('/logout', methods=['GET'])
def logout():
    user_id = session.get('user_id')
    full_name = session.get('full_name')
    ip_address = request.remote_addr

    # Ghi log thông tin đăng xuất
    if user_id:
        logging.info("User logged out: ID %s, Name: %s, IP: %s", user_id, full_name, ip_address)
    else:
        logging.warning("Logout attempted without a valid session. IP: %s", ip_address)

    session.clear()  # Xoá toàn bộ session

    return jsonify({"success": True, "message": "Đăng xuất thành công"})


# API kiểm tra session hiện tại có hợp lệ không
@app.route('/check_session', methods=['GET'])
def check_session():
    user_id = session.get('user_id')
    full_name = session.get('full_name')

    if user_id and full_name:
        return jsonify({
            "id": user_id,
            "full_name": full_name,
            "avatar": full_name[:2]  # Dùng 2 ký tự đầu tên làm avatar tạm
        })
    else:
        return jsonify({"error": "Chưa đăng nhập"}), 401


# API xử lý đăng ký tài khoản mới
@app.route('/register', methods=['POST'])
def register():
    # Lấy dữ liệu từ form gửi lên
    data = request.form
    full_name = data.get('full_name')
    email = data.get('email')
    password = data.get('password')

    # Băm mật khẩu trước khi lưu vào database
    password_hash = generate_password_hash(password)

    # Log thông tin đăng ký (dùng cho debug)
    print("Received registration request")
    print(f"Full Name: {full_name}, Email: {email}, Password: {password}")

    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    # Kiểm tra email đã tồn tại chưa
    cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
    existing_user = cursor.fetchone()

    if existing_user:
        print(f"Email already registered: {email}")
        db.close()
        return jsonify({"success": False, "message": "Email đã được đăng ký"}), 409
    else:
        print(f"Registering new user: {email}")
        # Thêm người dùng mới vào bảng users
        cursor.execute(
            "INSERT INTO users (full_name, email, password_hash) VALUES (%s, %s, %s)",
            (full_name, email, password_hash)
        )
        db.commit()
        db.close()
        return jsonify({"success": True, "message": "Đăng ký thành công"})
# ============================= #
#       ROUTING & TIỆN ÍCH      #
# ============================= #

# --- Hàm lấy User ID từ Session ---
def get_current_user_id():
    """
    Lấy user_id của người dùng hiện tại từ session.

    Trả về:
        int hoặc None: user_id nếu tồn tại trong session, ngược lại là None.
    """
    return session.get('user_id')

# Cấu hình JWT (JSON Web Token)
# JWT được sử dụng để xác thực người dùng sau khi đăng nhập.
app.config['JWT_SECRET_KEY'] = 'your-jwt-secret-key'  # **Cần thay bằng khóa bí mật mạnh và duy nhất**
jwt = JWTManager(app)


# Middleware (Decorator) để xử lý tự động kết nối và đóng kết nối cơ sở dữ liệu,
# đồng thời bắt lỗi trong quá trình thao tác DB.
def handle_db_operation(query_func):
    """
    Decorator xử lý kết nối/đóng kết nối DB và bắt lỗi cho các hàm thao tác DB.

    Args:
        query_func (function): Hàm gốc thực hiện thao tác DB.
                                Hàm này cần nhận (cursor, connection, *args, **kwargs).

    Returns:
        function: Hàm wrapper đã được bọc logic xử lý DB và lỗi.
    """
    # Sử dụng @wraps để giữ nguyên tên và docstring của hàm gốc khi sử dụng decorator
    @wraps(query_func)
    def wrapper(*args, **kwargs):
        connection = None
        cursor = None # Khởi tạo cursor ngoài khối try
        try:
            # Lấy kết nối cơ sở dữ liệu
            connection = get_db_connection()
            # Tạo cursor với dictionary=True để kết quả trả về là dictionary
            cursor = connection.cursor(dictionary=True)

            # Thực thi hàm thao tác DB gốc, truyền cursor và connection vào
            result = query_func(cursor, connection, *args, **kwargs)

            # Commit các thay đổi vào cơ sở dữ liệu
            connection.commit()

            # Trả về kết quả từ hàm gốc
            return result
        except Error as e:
            # Bắt lỗi liên quan đến cơ sở dữ liệu (từ mysql.connector)
            # Rollback các thay đổi nếu có lỗi
            if connection:
                connection.rollback()
            logging.error(f"Database Error: {e}", exc_info=True)
            return jsonify({"error": f"Lỗi cơ sở dữ liệu: {e}"}), 500 # Trả về lỗi DB với mã 500
        except Exception as e:
             # Bắt các lỗi ngoại lệ khác
            if connection:
                connection.rollback() # Rollback nếu có lỗi khác xảy ra trước khi commit
            logging.error(f"Application Error: {e}", exc_info=True)
            return jsonify({'error': f'Đã xảy ra lỗi: {e}'}), 500 # Trả về lỗi chung với mã 500
        finally:
            # Đảm bảo cursor và kết nối luôn được đóng
            if cursor:
                cursor.close()
            if connection and connection.is_connected():
                connection.close()
    return wrapper

# API: Lấy full_name của người dùng theo user_id
# Endpoint này yêu cầu người dùng đã đăng nhập (có user_id trong session)
@app.route('/api/user/full_name', methods=['GET'])
def get_user_full_name():
    """
    Lấy họ tên đầy đủ của người dùng hiện tại từ session.

    Yêu cầu:
        Người dùng phải đăng nhập (user_id tồn tại trong session).

    Trả về:
        JSON: {'full_name': 'Họ tên'} nếu thành công (mã 200).
        JSON: {'error': 'Thông báo lỗi'} nếu lỗi (mã 401, 404, 500).
    """
    # Lấy user_id của người dùng hiện tại từ session
    user_id = session.get('user_id')

    # Kiểm tra xem người dùng đã đăng nhập chưa
    if not user_id:
        # Nếu chưa có user_id trong session, trả về lỗi yêu cầu đăng nhập
        return jsonify({'error': 'Chưa đăng nhập hoặc phiên hết hạn'}), 401

    conn = None # Khởi tạo biến kết nối
    cursor = None # Khởi tạo biến cursor
    try:
        # Lấy kết nối đến cơ sở dữ liệu
        conn = get_db_connection()
        # Tạo cursor để thực thi truy vấn
        cursor = conn.cursor(dictionary=True) # Sử dụng dictionary=True để lấy kết quả dạng dictionary

        # Truy vấn lấy full_name từ bảng users dựa trên user_id
        # Thêm điều kiện is_active = 1 để chỉ lấy người dùng đang hoạt động
        query = """
            SELECT full_name
            FROM users
            WHERE id = %s
              AND is_active = 1
        """
        cursor.execute(query, (user_id, )) # Thực thi truy vấn với user_id

        # Lấy kết quả truy vấn (chỉ lấy 1 dòng vì user_id là duy nhất)
        user = cursor.fetchone()

        # Kiểm tra xem có tìm thấy người dùng hoạt động với user_id này không
        if not user:
            # Nếu không tìm thấy hoặc tài khoản không hoạt động, trả về lỗi 404 Not Found
            return jsonify({'error': 'Không tìm thấy người dùng hoặc tài khoản không hoạt động'}), 404

        # Nếu tìm thấy, trả về full_name dưới dạng JSON
        return jsonify({'full_name': user['full_name']}), 200

    except Error as e:
        # Bắt lỗi cơ sở dữ liệu và trả về mã 500 Internal Server Error
        logging.error(f"Database Error in get_user_full_name: {e}", exc_info=True)
        return jsonify({'error': f'Lỗi cơ sở dữ liệu: {e}'}), 500
    except Exception as e:
        # Bắt các lỗi ngoại lệ khác và trả về mã 500 Internal Server Error
        logging.error(f"Application Error in get_user_full_name: {e}", exc_info=True)
        return jsonify({'error': f'Đã xảy ra lỗi: {e}'}), 500
    finally:
        # Đảm bảo cursor và kết nối luôn được đóng
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()

# API lấy tên nhóm hiện tại của người dùng (nếu có)
# Endpoint này lấy user_id từ query string
@app.route('/api/user_group', methods=['GET'])
def get_user_group():
    """
    Kiểm tra trạng thái nhóm của người dùng dựa trên user_id.
    Kiểm tra xem người dùng có đang ở trong nhóm Active hoặc có yêu cầu Pending không.

    Yêu cầu:
        Tham số 'user_id' trong query string.

    Trả về:
        JSON: {'group': 'Tên nhóm'} nếu đang Active (mã 200).
        JSON: {'message': 'chua_tham_gia'} nếu đang Pending (mã 200).
        JSON: {'message': 'chua_co_nhom'} nếu không có nhóm Active/Pending (mã 404).
        JSON: {'error': 'Thông báo lỗi'} nếu lỗi (mã 400, 500).
    """
    # Lấy user_id từ query string (ví dụ: /api/user_group?user_id=123)
    user_id = request.args.get('user_id')

    # Kiểm tra xem user_id có được cung cấp không
    if not user_id:
        # Trả về lỗi 400 Bad Request nếu không có user_id
        return jsonify({'error': 'User ID is required'}), 400

    conn = None # Khởi tạo biến kết nối
    cursor = None # Khởi tạo biến cursor
    try:
        # Kết nối đến cơ sở dữ liệu
        conn = get_db_connection()
        # Tạo cursor với dictionary=True để kết quả trả về là dictionary
        cursor = conn.cursor(dictionary=True)

        # 1) Truy vấn kiểm tra xem người dùng có đang ở trong nhóm có trạng thái 'Active' không
        query = """
        SELECT g.group_name
          FROM groups g
          JOIN members m ON m.group_id = g.id
         WHERE m.user_id = %s
           AND m.status = 'Active'
         LIMIT 1 -- Chỉ cần tìm 1 nhóm Active là đủ
        """
        cursor.execute(query, (user_id,)) # Thực thi truy vấn
        group = cursor.fetchone() # Lấy kết quả

        # Nếu tìm thấy nhóm Active, trả về tên nhóm và mã 200 OK
        if group:
            return jsonify({'group': group['group_name']}), 200

        # 2) Nếu không có nhóm Active, kiểm tra xem có yêu cầu tham gia nhóm nào đang chờ duyệt ('Pending') không
        query2 = """
        SELECT 1 -- Chỉ cần kiểm tra sự tồn tại, không cần lấy dữ liệu cụ thể
          FROM members
         WHERE user_id = %s
           AND status = 'Pending'
         LIMIT 1 -- Chỉ cần tìm 1 yêu cầu Pending là đủ
        """
        cursor.execute(query2, (user_id,)) # Thực thi truy vấn thứ hai
        pending = cursor.fetchone() # Lấy kết quả

        # Kiểm tra xem có yêu cầu Pending nào không
        if pending:
            # Nếu có, thông báo người dùng chưa được tham gia nhóm (đang chờ duyệt)
            return jsonify({'message': 'chua_tham_gia'}), 200 # Trả về mã 200 vì đây không phải lỗi, chỉ là trạng thái

        else:
            # Nếu không có nhóm Active và không có yêu cầu Pending, thông báo người dùng chưa có nhóm
            return jsonify({'message': 'chua_co_nhom'}), 404 # Trả về mã 404 Not Found vì không tìm thấy trạng thái nhóm Active/Pending

    except Error as e:
        # Bắt lỗi cơ sở dữ liệu
        logging.error(f"Database Error in get_user_group: {e}", exc_info=True)
        return jsonify({'error': f'Lỗi cơ sở dữ liệu: {e}'}), 500 # Trả về mã 500 Internal Server Error
    except Exception as e:
        # Bắt các lỗi ngoại lệ khác
        logging.error(f"Application Error in get_user_group: {e}", exc_info=True)
        return jsonify({'error': f'Đã xảy ra lỗi: {e}'}), 500 # Trả về mã 500 Internal Server Error
    finally:
        # Đảm bảo cursor và kết nối luôn được đóng
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()


# API lấy 2 chữ cái đầu trong họ tên người dùng (viết hoa)
# Endpoint này lấy user_id từ session (người dùng đã đăng nhập)
@app.route('/api/user_initials', methods=['GET'])
def get_user_initials():
    """
    Lấy 2 chữ cái đầu tiên trong họ tên của người dùng hiện tại và viết hoa.

    Yêu cầu:
        Người dùng phải đăng nhập (user_id tồn tại trong session).

    Trả về:
        JSON: {'initials': 'XY'} nếu thành công (mã 200).
        JSON: {'error': 'Thông báo lỗi'} nếu lỗi (mã 401, 404, 500).
    """
    # Lấy user_id từ session (người dùng đã đăng nhập)
    user_id = session.get('user_id')

    # Kiểm tra xem người dùng đã đăng nhập chưa
    if not user_id:
        # Nếu chưa đăng nhập, trả về lỗi 401 Unauthorized
        return jsonify({'error': 'Chưa đăng nhập'}), 401

    conn = None # Khởi tạo biến kết nối
    cursor = None # Khởi tạo biến cursor
    try:
        # Kết nối đến cơ sở dữ liệu
        conn = get_db_connection()
        # Tạo cursor để thực thi truy vấn
        cursor = conn.cursor(dictionary=True) # Sử dụng dictionary=True để lấy kết quả dạng dictionary

        # Truy vấn họ tên đầy đủ (full_name) từ bảng users dựa trên user_id
        cursor.execute("SELECT full_name FROM users WHERE id = %s", (user_id,))
        row = cursor.fetchone() # Lấy kết quả

        # Kiểm tra xem có tìm thấy người dùng với user_id này không
        if not row:
            # Trả về lỗi 404 Not Found nếu user không tồn tại trong DB
            return jsonify({'error': 'User không tồn tại'}), 404

        # Lấy họ tên đầy đủ từ kết quả truy vấn
        full_name = row['full_name']
        # Loại bỏ khoảng trắng ở đầu và cuối chuỗi
        full_name = full_name.strip()
        # Tách họ tên thành các phần dựa trên khoảng trắng
        parts = full_name.split()

        # Logic để lấy 2 chữ cái đầu:
        if len(parts) >= 2:
            # Nếu họ tên có ít nhất 2 từ, lấy chữ cái đầu của từ đầu tiên và từ thứ hai
            initials = parts[0][0] + parts[1][0]
        elif len(parts) == 1:
            # Nếu họ tên chỉ có 1 từ, lấy 2 ký tự đầu tiên của từ đó
            initials = full_name[:2]
        else:
             # Trường hợp tên rỗng hoặc chỉ có khoảng trắng sau khi strip
             initials = "NN" # Hoặc có thể trả về lỗi hoặc một giá trị mặc định khác

        # Chuyển các chữ cái đầu thành chữ hoa
        initials = initials.upper()

        # Trả kết quả dưới dạng JSON với mã 200 OK
        return jsonify({'initials': initials}), 200

    except Error as e:
        # Bắt lỗi cơ sở dữ liệu
        logging.error(f"Database Error in get_user_initials: {e}", exc_info=True)
        return jsonify({'error': f'Lỗi cơ sở dữ liệu: {e}'}), 500 # Trả về mã 500 Internal Server Error
    except Exception as e:
        # Bắt các lỗi ngoại lệ khác
        logging.error(f"Application Error in get_user_initials: {e}", exc_info=True)
        return jsonify({'error': f'Đã xảy ra lỗi: {e}'}), 500 # Trả về mã 500 Internal Server Error
    finally:
        # Đảm bảo cursor và kết nối luôn được đóng để tránh rò rỉ tài nguyên
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()


# Endpoint để xử lý quét mã QR từ ảnh tải lên
# Sử dụng thư viện OpenCV để đọc mã QR
@app.route('/api/scan-qr', methods=['POST'])
def scan_qr():
    """
    Xử lý yêu cầu tải lên ảnh chứa mã QR để quét và lấy thông tin nhóm.

    Yêu cầu:
        Phương thức POST.
        File ảnh mã QR được gửi trong request dưới dạng 'qr_image'.
        Người dùng phải được xác thực (user_id có trong session).

    Trả về:
        JSON: Thông tin nhóm (id, name, code, member_count) nếu quét thành công (mã 200).
        JSON: {'error': 'Thông báo lỗi'} nếu lỗi (mã 401, 400, 404, 500).
    """
    try:
        # 1. Xác thực người dùng: Kiểm tra xem người dùng đã đăng nhập chưa
        current_user_id = get_current_user_id()
        if not current_user_id:
            # Nếu chưa đăng nhập, trả về lỗi xác thực 401 Unauthorized
            return jsonify({"error": "Authentication required"}), 401

        # 2. Kiểm tra file upload: Đảm bảo có file ảnh được gửi lên
        if 'qr_image' not in request.files:
            # Nếu không có trường 'qr_image' trong request.files, trả về lỗi 400 Bad Request
            return jsonify({"error": "No QR image provided"}), 400

        file = request.files['qr_image']
        # Kiểm tra xem file có rỗng hoặc không có tên không
        if not file or file.filename == '':
             # Nếu file rỗng hoặc không có tên, trả về lỗi 400 Bad Request
            return jsonify({"error": "No QR image provided"}), 400

        # 3. Đọc và phân tích QR code từ ảnh
        # Đọc nội dung file ảnh thành byte string, sau đó chuyển thành numpy array (kiểu uint8)
        file_bytes = np.frombuffer(file.read(), np.uint8)
        # Sử dụng OpenCV để giải mã ảnh từ numpy array
        img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)

        # Sử dụng bộ phát hiện mã QR của OpenCV
        qr_detector = cv2.QRCodeDetector()
        # detectAndDecode trả về data (nội dung QR), points (các điểm góc của QR), và bounding box (không dùng ở đây)
        data, points, _ = qr_detector.detectAndDecode(img)

        # Kiểm tra xem OpenCV có giải mã được mã QR không
        if not data:
            # Nếu không giải mã được, trả về lỗi 400 Bad Request
            return jsonify({"error": "Could not decode QR code"}), 400

        # 4. Lấy random_code từ nội dung QR đã giải mã
        random_code = data

        # 5. Kết nối database để tìm thông tin nhóm
        connection = None # Khởi tạo biến kết nối
        cursor = None # Khởi tạo biến cursor
        try:
            connection = get_db_connection()
            cursor = connection.cursor(dictionary=True) # Sử dụng dictionary=True

            # 6. Tìm nhóm dựa trên random_code từ mã QR
            # Truy vấn bảng 'groups' để tìm nhóm có 'random_code' tương ứng
            cursor.execute(
                "SELECT id, group_name, group_code FROM groups WHERE random_code = %s",
                (random_code,)
            )
            group = cursor.fetchone() # Lấy kết quả tìm được

            # Nếu không tìm thấy nhóm nào với random_code này
            if not group:
                # Trả về lỗi 404 Not Found (Mã QR không hợp lệ)
                return jsonify({"error": "Invalid QR code"}), 404

            # Phân rã thông tin nhóm tìm được
            group_id = group['id']
            group_name = group['group_name']
            group_code = group['group_code']

            # 7. Kiểm tra xem người dùng hiện tại đã là thành viên của nhóm này chưa
            cursor.execute(
                "SELECT id FROM members WHERE user_id = %s AND group_id = %s",
                (current_user_id, group_id)
            )
            # Nếu tìm thấy một bản ghi thành viên (nghĩa là người dùng đã là thành viên)
            if cursor.fetchone():
                # Trả về lỗi 400 Bad Request (Đã là thành viên)
                return jsonify({"error": "You are already a member of this group"}), 400

            # 8. Đếm số thành viên hiện tại đang ở trạng thái 'Active' trong nhóm
            cursor.execute(
                "SELECT COUNT(*) AS member_count FROM members WHERE group_id = %s AND status = 'Active'",
                (group_id,)
            )
            member_count = cursor.fetchone()['member_count'] # Lấy số lượng từ kết quả

            # 10. Trả về thông tin chi tiết của nhóm vừa quét được
            return jsonify({
                "message": "QR code scanned successfully",
                "group": {
                    "id": group_id,
                    "name": group_name,
                    "code": group_code,
                    "member_count": member_count
                }
            }), 200 # Trả về mã 200 OK

        except Error as e:
             # Bắt lỗi cơ sở dữ liệu trong khối try/except lồng nhau
            logging.error(f"Database Error during QR scan process: {e}", exc_info=True)
            return jsonify({'error': f'Lỗi cơ sở dữ liệu khi quét QR: {e}'}), 500 # Trả về mã 500
        finally:
             # Đảm bảo đóng kết nối DB nếu nó đã được mở
            if cursor:
                cursor.close()
            if connection and connection.is_connected():
                connection.close()

    except Exception as e:
        # Bắt các lỗi ngoại lệ khác xảy ra trong toàn bộ hàm (ngoài thao tác DB)
        logging.error(f"General Error in scan_qr: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500 # Trả về mã 500 Internal Server Error
# --- Lấy danh sách thành viên để hiển thị tên trong <select> ---
@app.route('/api/members_exp', methods=['GET'])
def get_members_exp():
    # 1) Kiểm tra xem user đã login chưa
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401

    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)

    # 2) Lấy group_id mà user hiện tại đang tham gia (status = 'Active')
    cur.execute("""
        SELECT group_id 
        FROM members 
        WHERE user_id = %s 
          AND status = 'Active'
        LIMIT 1
    """, (user_id,))
    row = cur.fetchone()
    if not row:
        # Nếu user chưa join nhóm nào, trả về mảng rỗng
        cur.close()
        conn.close()
        return jsonify([]), 200

    group_id = row['group_id']

    # 3) Query danh sách thành viên của nhóm đó
    cur.execute("""
        SELECT m.id, u.full_name
        FROM members m
        JOIN users u ON m.user_id = u.id
        WHERE m.group_id = %s
        ORDER BY u.full_name
    """, (group_id,))
    members = cur.fetchall()

    cur.close()
    conn.close()
    return jsonify(members), 200
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

# ============================= #
#       ROUTING & Groups      #
# ============================= #

# Route để trả về thông tin chi tiết của một thành viên dựa trên ID thành viên
@app.route('/api/member/<int:member_id>', methods=['GET'])
def get_member(member_id):
    """
    Lấy thông tin chi tiết của một thành viên cụ thể dựa trên ID thành viên.

    Args:
        member_id (int): ID của bản ghi thành viên trong bảng 'members'.

    Yêu cầu:
        Phương thức GET.

    Trả về:
        JSON: Thông tin chi tiết thành viên (bao gồm thông tin user, role, status, group_name, v.v.)
              nếu tìm thấy (mã 200).
        JSON: {'error': 'Member not found'} nếu không tìm thấy thành viên (mã 404).
        JSON: {'error': 'Thông báo lỗi'} nếu có lỗi xảy ra (mã 500).
    """
    conn = None # Khởi tạo biến kết nối
    cursor = None # Khởi tạo biến cursor
    try:
        # Lấy kết nối đến cơ sở dữ liệu
        conn = get_db_connection()
        # Tạo cursor để thực thi truy vấn, kết quả trả về dạng dictionary
        cursor = conn.cursor(dictionary=True)

        # Truy vấn lấy thông tin thành viên bằng cách JOIN các bảng 'members', 'users', 'groups'
        # Dùng Alias (AS) để đặt tên rõ ràng cho các cột trùng tên (ví dụ: id)
        query = """
            SELECT m.id AS member_id, u.full_name, u.email, m.role, m.status, m.join_date, m.leave_date, u.avatar, m.created_at, m.updated_at, g.group_name
            FROM members m
            JOIN users u ON m.user_id = u.id     -- Nối với bảng users để lấy thông tin người dùng
            JOIN groups g ON m.group_id = g.id   -- Nối với bảng groups để lấy tên nhóm
            WHERE m.id = %s -- Lọc theo ID của bản ghi thành viên
        """
        cursor.execute(query, (member_id,)) # Thực thi truy vấn với member_id
        member = cursor.fetchone() # Lấy kết quả (một dòng duy nhất)

        # In ra dữ liệu thành viên đã lấy được (để debug)
        print("Retrieved member data:", member)

        # Kiểm tra xem có tìm thấy thành viên nào không
        if member:
            # Nếu tìm thấy, trả về thông tin thành viên dưới dạng JSON
            return jsonify(member), 200
        else:
            # Nếu không tìm thấy, trả về lỗi 404 Not Found
            return jsonify({"error": "Member not found"}), 404

    except Exception as e:
        # Bắt các lỗi ngoại lệ và trả về mã 500 Internal Server Error
        logging.error(f"Error fetching member details for ID {member_id}: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500
    finally:
        # Đảm bảo đóng cursor và kết nối
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()

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

# API lấy danh sách thành viên của các nhóm mà người dùng hiện tại thuộc về
# Hỗ trợ phân trang, tìm kiếm và lọc
@app.route('/api/members', methods=['GET'])
def get_members():
    """
    Lấy danh sách thành viên từ các nhóm mà người dùng hiện tại là thành viên.
    Hỗ trợ phân trang, tìm kiếm (theo tên, email) và lọc (theo vai trò, trạng thái).
    Cung cấp thông tin group_code, group_name và quyền admin của nhóm đầu tiên tìm thấy.

    Yêu cầu:
        Phương thức GET.
        Có thể kèm theo các tham số query string:
        - page (int): Số trang (mặc định 1).
        - perPage (int): Số lượng mục trên mỗi trang (mặc định 5).
        - search (str): Chuỗi tìm kiếm trong tên hoặc email.
        - role (str): Lọc theo vai trò thành viên.
        - status (str): Lọc theo trạng thái thành viên.

    Trả về:
        JSON: {'members': [...], 'totalMembers': count, 'group_code': '...', 'group_name': '...', 'is_admin': bool}
              (mã 200).
        JSON: {'error': 'Authentication required'} nếu chưa đăng nhập (mã 401).
        JSON: {'error': 'Thông báo lỗi'} nếu có lỗi xảy ra (mã 500).
    """
    conn = None  # Khởi tạo biến kết nối
    cursor = None  # Khởi tạo biến cursor
    try:
        # 1. Xác thực người dùng: Lấy ID người dùng hiện tại từ session
        current_user_id = get_current_user_id()
        if not current_user_id:
            return jsonify({"error": "Authentication required"}), 401

        # 2. Lấy tham số từ query string cho phân trang, tìm kiếm, lọc
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('perPage', 5))
        search = request.args.get('search', '')
        role_filter = request.args.get('role', '')
        status_filter = request.args.get('status', '')

        # Lấy kết nối đến cơ sở dữ liệu
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # 3. Lấy group_id và role của người dùng hiện tại trong tất cả các nhóm
        user_memberships_query = "SELECT group_id, role FROM members WHERE user_id = %s"
        cursor.execute(user_memberships_query, (current_user_id,))
        user_memberships = cursor.fetchall()

        # Tạo danh sách group_id và ánh xạ role
        user_group_ids = [m['group_id'] for m in user_memberships]
        user_role_map = {m['group_id']: m['role'] for m in user_memberships}

        # Nếu không có nhóm, trả về danh sách rỗng
        if not user_group_ids:
            return jsonify({
                'members': [],
                'totalMembers': 0,
                'group_code': None,
                'group_name': None,
                'is_admin': False
            }), 200

        # 4. Lấy group_code và group_name của nhóm đầu tiên
        group_filter_placeholders = ', '.join(['%s'] * len(user_group_ids))
        cursor.execute(
            f"SELECT group_code, group_name FROM groups WHERE id IN ({group_filter_placeholders}) LIMIT 1",
            tuple(user_group_ids)
        )
        group = cursor.fetchone()
        group_code = group['group_code'] if group else None
        group_name = group['group_name'] if group else None

        # 5. Xác định quyền admin
        is_admin = user_role_map.get(user_group_ids[0], '') == 'Admin' if user_group_ids else False

        # 6. Xây dựng câu truy vấn chính để lấy danh sách thành viên
        query = f"""
            SELECT m.id AS member_id, m.user_id, u.full_name, u.email, m.role, m.status,
                   g.group_name, m.group_id, LEFT(u.full_name, 1) AS initials
            FROM members m
            JOIN users u ON m.user_id = u.id
            JOIN groups g ON m.group_id = g.id
            WHERE m.group_id IN ({group_filter_placeholders})
            AND (u.full_name LIKE %s OR u.email LIKE %s)
            AND (%s = '' OR m.role = %s)
            AND (%s = '' OR m.status = %s)
            ORDER BY u.full_name
            LIMIT %s OFFSET %s
        """
        search_pattern = f"%{search}%"
        offset = (page - 1) * per_page
        query_params = user_group_ids + [search_pattern, search_pattern, role_filter, role_filter, status_filter, status_filter, per_page, offset]

        cursor.execute(query, tuple(query_params))
        members = cursor.fetchall()

        # 7. Xử lý danh sách thành viên để thêm thông tin 'can_delete'
        processed_members = []
        for member in members:
            can_delete = user_role_map.get(member['group_id'], '') == 'Admin' and member['user_id'] != current_user_id
            processed_member = member.copy()
            processed_member['can_delete'] = can_delete
            processed_members.append(processed_member)

        # 8. Đếm tổng số thành viên
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

        # 9. Đóng cursor và kết nối
        cursor.close()
        conn.close()

        # 10. Trả về kết quả
        return jsonify({
            'members': processed_members,
            'totalMembers': total_members,
            'group_code': group_code,
            'group_name': group_name,
            'is_admin': is_admin
        }), 200

    except Exception as e:
        logging.error(f"Error fetching members: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()

# Route để xóa một thành viên khỏi nhóm dựa trên ID thành viên
# Endpoint này yêu cầu người dùng hiện tại phải là Admin của nhóm đó
@app.route('/api/member/<int:member_id>', methods=['DELETE'])
def delete_member(member_id):
    """
    Xóa một thành viên khỏi nhóm.

    Args:
        member_id (int): ID của bản ghi thành viên trong bảng 'members' cần xóa.

    Yêu cầu:
        Phương thức DELETE.
        Người dùng phải đăng nhập (user_id tồn tại trong session).
        Người dùng hiện tại phải là Admin của nhóm mà thành viên cần xóa thuộc về.
        Người dùng không được tự xóa chính mình.

    Trả về:
        JSON: {'message': 'Member deleted successfully'} nếu xóa thành công (mã 200).
        JSON: {'error': 'Authentication required'} nếu chưa đăng nhập (mã 401).
        JSON: {'error': 'Unauthorized...'} nếu không đủ quyền (mã 403).
        JSON: {'error': 'Member not found'} nếu thành viên không tồn tại (mã 404).
        JSON: {'error': 'You cannot delete yourself...'} nếu tự xóa mình (mã 400).
        JSON: {'error': 'Thông báo lỗi'} nếu có lỗi xảy ra (mã 500).
    """
    print(f"Attempting to delete member with ID: {member_id}") # Log debug
    # 1. Xác thực người dùng: Lấy ID người dùng hiện tại từ session
    current_user_id = get_current_user_id()

    # Kiểm tra xem người dùng đã đăng nhập chưa
    if not current_user_id:
        # Nếu chưa đăng nhập, trả về lỗi 401 Unauthorized
        return jsonify({"error": "Authentication required"}), 401

    connection = None # Khởi tạo biến kết nối
    cursor = None # Khởi tạo biến cursor
    try:
        # Lấy kết nối đến cơ sở dữ liệu
        connection = get_db_connection()
        # Tạo cursor để thực thi truy vấn, kết quả trả về dạng dictionary
        cursor = connection.cursor(dictionary=True)

        # 2. Lấy group_id và user_id của thành viên cần xóa
        # Cần thông tin này để kiểm tra quyền của người dùng hiện tại
        cursor.execute("SELECT group_id, user_id FROM members WHERE id = %s", (member_id,))
        member_to_delete = cursor.fetchone() # Lấy thông tin thành viên cần xóa

        # Kiểm tra xem bản ghi thành viên có tồn tại không
        if not member_to_delete:
            # Nếu không tìm thấy, trả về lỗi 404 Not Found
            return jsonify({"error": "Member not found"}), 404

        # Lấy group_id và user_id của thành viên cần xóa
        target_group_id = member_to_delete['group_id']
        target_user_id = member_to_delete['user_id']

        # 3. Kiểm tra xem người dùng hiện tại có đang cố gắng tự xóa mình không
        # Ngăn không cho admin tự ý rời khỏi nhóm bằng cách xóa bản ghi thành viên của chính mình.
        if target_user_id == current_user_id:
             # Trả về lỗi 400 Bad Request nếu người dùng tự xóa mình
             return jsonify({"error": "You cannot delete yourself from the group."}), 400

        # 4. Lấy vai trò của người dùng hiện tại trong nhóm của thành viên cần xóa
        cursor.execute("SELECT role FROM members WHERE user_id = %s AND group_id = %s", (current_user_id, target_group_id))
        current_user_membership = cursor.fetchone() # Lấy thông tin thành viên của người dùng hiện tại trong nhóm đó

        # 5. Kiểm tra xem người dùng hiện tại có tồn tại trong nhóm này và có vai trò là Admin không
        if not current_user_membership or current_user_membership['role'] != 'Admin':
            # Nếu không tìm thấy bản ghi thành viên của người dùng hiện tại trong nhóm,
            # hoặc vai trò không phải là 'Admin', trả về lỗi 403 Forbidden
            return jsonify({"error": "Unauthorized. Only group admins can delete members."}), 403

        # 6. Nếu đã đủ quyền, tiến hành xóa bản ghi thành viên khỏi bảng 'members'
        delete_query = "DELETE FROM members WHERE id = %s"
        cursor.execute(delete_query, (member_id,)) # Thực thi câu lệnh DELETE
        connection.commit() # Commit thay đổi vào cơ sở dữ liệu

        # 7. Kiểm tra xem có bản ghi nào thực sự bị xóa không (số dòng bị ảnh hưởng)
        if cursor.rowcount == 0:
             # Nếu không có dòng nào bị xóa, có thể do thành viên đã bị xóa trước đó
             # hoặc lỗi race condition. Trả về lỗi 404.
             return jsonify({"error": "Member not found or already deleted."}), 404

        # In log thông báo xóa thành công
        print(f"Successfully deleted member with ID: {member_id} (User ID: {target_user_id}) from group {target_group_id} by user {current_user_id}")
        # Trả về thông báo thành công với mã 200 OK
        return jsonify({"message": "Member deleted successfully"}), 200

    except Exception as e:
        # Bắt các lỗi ngoại lệ và trả về mã 500 Internal Server Error
        logging.error(f"Error deleting member with ID {member_id}: {e}", exc_info=True)
        print(f"Error deleting member: {e}") # In log lỗi
        # Rollback các thay đổi nếu có lỗi xảy ra trước khi commit
        if connection:
             connection.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        # Đảm bảo đóng cursor và kết nối nếu chúng đã được mở
        if cursor:
            cursor.close()
        if connection:
            connection.close()


# API lấy thông tin của người dùng hiện tại (đã đăng nhập)
# Bao gồm id, full_name, email và vai trò (nếu thuộc nhóm)
@app.route('/api/current-user', methods=['GET'])
def get_current_user():
    """
    Lấy thông tin của người dùng hiện tại đã đăng nhập.
    Bao gồm id, full_name, email và vai trò (nếu họ là thành viên của bất kỳ nhóm nào - lấy vai trò đầu tiên tìm thấy).

    Yêu cầu:
        Phương thức GET.
        Người dùng phải đăng nhập (user_id tồn tại trong session).

    Trả về:
        JSON: {'id': ..., 'full_name': '...', 'email': '...', 'role': '...'} nếu thành công (mã 200).
        JSON: {'error': 'Authentication required'} nếu chưa đăng nhập (mã 401).
        JSON: {'error': 'User not found'} nếu không tìm thấy người dùng trong DB (mã 404).
        JSON: {'error': 'Thông báo lỗi'} nếu có lỗi xảy ra (mã 500).
    """
    conn = None # Khởi tạo biến kết nối
    cursor = None # Khởi tạo biến cursor
    try:
        # 1. Xác thực người dùng: Lấy ID người dùng hiện tại từ session
        current_user_id = get_current_user_id()
        if not current_user_id:
            # Nếu chưa đăng nhập, trả về lỗi 401 Unauthorized
            return jsonify({"error": "Authentication required"}), 401

        # Lấy kết nối đến cơ sở dữ liệu
        connection = get_db_connection()
        # Tạo cursor để thực thi truy vấn, kết quả trả về dạng dictionary
        cursor = connection.cursor(dictionary=True)

        # 2. Lấy thông tin người dùng hiện tại và vai trò của họ trong các nhóm (nếu có)
        # Sử dụng LEFT JOIN với bảng members để lấy thông tin người dùng kể cả khi họ chưa thuộc nhóm nào.
        # Nếu user thuộc nhiều nhóm, truy vấn này sẽ trả về nhiều dòng cho cùng user_id.
        # Tuy nhiên, chúng ta chỉ fetchone(), nên sẽ lấy vai trò từ bản ghi thành viên đầu tiên tìm thấy.
        query = """
            SELECT u.id, u.full_name, u.email, m.role, m.group_id
            FROM users u
            LEFT JOIN members m ON u.id = m.user_id -- LEFT JOIN để lấy user kể cả khi không có trong members
            WHERE u.id = %s -- Lọc theo ID người dùng hiện tại
            LIMIT 1 -- Chỉ cần lấy một bản ghi user (và vai trò đầu tiên tìm thấy nếu có)
        """
        cursor.execute(query, (current_user_id,)) # Thực thi truy vấn
        user = cursor.fetchone() # Lấy kết quả

        # 3. Kiểm tra xem có tìm thấy người dùng không
        if user:
            # Nếu tìm thấy, trả về thông tin người dùng
            # Vai trò ('role') có thể là None nếu user chưa thuộc nhóm nào. Mặc định là 'Member'.
            return jsonify({
                'id': user['id'],
                'full_name': user['full_name'],
                'email': user['email'],
                'role': user['role'] or 'Member'  # Mặc định vai trò là 'Member' nếu là None
            }), 200
        else:
            # Nếu không tìm thấy người dùng trong bảng 'users', trả về lỗi 404 Not Found
            return jsonify({"error": "User not found"}), 404

    except Exception as e:
        # Bắt các lỗi ngoại lệ và trả về mã 500 Internal Server Error
        logging.error(f"Error fetching current user details: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500
    finally:
        # Đảm bảo đóng cursor và kết nối nếu chúng đã được mở
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# Endpoint để Admin duyệt yêu cầu tham gia nhóm của một thành viên
@app.route('/api/member/<int:member_id>/approve', methods=['POST'])
def approve_member(member_id):
    """
    Duyệt yêu cầu tham gia nhóm của một thành viên (chuyển trạng thái từ 'Pending' sang 'Active').

    Args:
        member_id (int): ID của bản ghi thành viên trong bảng 'members' cần duyệt.

    Yêu cầu:
        Phương thức POST.
        Người dùng phải đăng nhập (user_id tồn tại trong session).
        Người dùng hiện tại phải là Admin của nhóm mà thành viên cần duyệt thuộc về.
        Thành viên cần duyệt phải tồn tại và đang ở trạng thái 'Pending'.

    Trả về:
        JSON: {'message': 'Member approved successfully'} nếu duyệt thành công (mã 200).
        JSON: {'error': 'Authentication required'} nếu chưa đăng nhập (mã 401).
        JSON: {'error': 'You do not have permission...'} nếu không đủ quyền (mã 403).
        JSON: {'error': 'Member not found'} nếu thành viên không tồn tại (mã 404).
        JSON: {'error': 'Member is not in pending status'} nếu thành viên không ở trạng thái Pending (mã 400).
        JSON: {'error': 'Thông báo lỗi'} nếu có lỗi xảy ra (mã 500).
    """
    connection = None # Khởi tạo biến kết nối
    cursor = None # Khởi tạo biến cursor
    try:
        # 1. Xác thực người dùng: Lấy ID người dùng hiện tại từ session
        current_user_id = get_current_user_id()
        if not current_user_id:
            # Nếu chưa đăng nhập, trả về lỗi 401 Unauthorized
            return jsonify({"error": "Authentication required"}), 401

        # 2. Kết nối database
        connection = get_db_connection()
        cursor = connection.cursor() # Không cần dictionary=True ở đây nếu chỉ kiểm tra sự tồn tại

        # 3. Kiểm tra quyền admin: Kiểm tra xem người dùng hiện tại có phải là Admin trong nhóm của thành viên cần duyệt không
        # Truy vấn kiểm tra: tìm bản ghi thành viên của người dùng hiện tại,
        # trong cùng nhóm với thành viên cần duyệt, và có role là 'Admin'.
        cursor.execute(
            """
            SELECT id FROM members
            WHERE user_id = %s
              AND group_id = (SELECT group_id FROM members WHERE id = %s) -- Lấy group_id của thành viên cần duyệt
              AND role = 'Admin'
            """,
            (current_user_id, member_id) # Truyền user_id hiện tại và member_id cần duyệt
        )
        # Nếu không tìm thấy bản ghi nào (tức không phải admin trong nhóm này)
        if not cursor.fetchone():
            # Trả về lỗi 403 Forbidden
            return jsonify({"error": "You do not have permission to approve this member"}), 403

        # 4. Kiểm tra thành viên tồn tại và đang ở trạng thái Pending
        # Truy vấn lấy trạng thái hiện tại của thành viên cần duyệt
        cursor.execute(
            "SELECT status FROM members WHERE id = %s",
            (member_id,) # Truyền member_id cần duyệt
        )
        member = cursor.fetchone() # Lấy kết quả

        # Kiểm tra xem có tìm thấy thành viên không
        if not member:
            # Nếu không tìm thấy, trả về lỗi 404 Not Found
            return jsonify({"error": "Member not found"}), 404
        # Kiểm tra xem trạng thái có phải là 'Pending' không
        if member[0] != 'Pending':
            # Nếu không phải 'Pending', trả về lỗi 400 Bad Request
            return jsonify({"error": "Member is not in pending status"}), 400

        # 5. Cập nhật trạng thái của thành viên thành 'Active'
        update_member_query = """
            UPDATE members
            SET status = 'Active', updated_at = %s -- Cập nhật trạng thái và thời gian cập nhật
            WHERE id = %s -- Áp dụng cho bản ghi thành viên có ID tương ứng
        """
        now = datetime.now() # Lấy thời gian hiện tại
        cursor.execute(update_member_query, (now, member_id)) # Thực thi câu lệnh UPDATE

        # 6. Commit các thay đổi vào cơ sở dữ liệu và đóng kết nối
        connection.commit()

        # 7. Trả về thông báo thành công với mã 200 OK
        return jsonify({"message": "Member approved successfully"}), 200

    except Exception as e:
        # Bắt các lỗi ngoại lệ và trả về mã 500 Internal Server Error
        logging.error(f"Error in approve_member for ID {member_id}: {e}", exc_info=True)
        # Rollback các thay đổi nếu có lỗi xảy ra trước khi commit
        if connection:
             connection.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        # Đảm bảo đóng cursor và kết nối nếu chúng đã được mở
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# Endpoint để Admin từ chối yêu cầu tham gia nhóm của một thành viên
# Bằng cách xóa bản ghi thành viên đó khỏi bảng 'members'
@app.route('/api/member/<int:member_id>/reject', methods=['POST'])
def reject_member(member_id):
    """
    Từ chối yêu cầu tham gia nhóm của một thành viên (xóa bản ghi khỏi DB).

    Args:
        member_id (int): ID của bản ghi thành viên trong bảng 'members' cần từ chối.

    Yêu cầu:
        Phương thức POST.
        Người dùng phải đăng nhập (user_id tồn tại trong session).
        Người dùng hiện tại phải là Admin của nhóm mà thành viên cần từ chối thuộc về.
        Thành viên cần từ chối phải tồn tại và đang ở trạng thái 'Pending'.

    Trả về:
        JSON: {'message': 'Member rejected successfully'} nếu từ chối thành công (mã 200).
        JSON: {'error': 'Authentication required'} nếu chưa đăng nhập (mã 401).
        JSON: {'error': 'You do not have permission...'} nếu không đủ quyền (mã 403).
        JSON: {'error': 'Member not found'} nếu thành viên không tồn tại (mã 404).
        JSON: {'error': 'Member is not in pending status'} nếu thành viên không ở trạng thái Pending (mã 400).
        JSON: {'error': 'Thông báo lỗi'} nếu có lỗi xảy ra (mã 500).
    """
    connection = None # Khởi tạo biến kết nối
    cursor = None # Khởi tạo biến cursor
    try:
        # 1. Xác thực người dùng: Lấy ID người dùng hiện tại từ session
        current_user_id = get_current_user_id()
        if not current_user_id:
            # Nếu chưa đăng nhập, trả về lỗi 401 Unauthorized
            return jsonify({"error": "Authentication required"}), 401

        # 2. Kết nối database
        connection = get_db_connection()
        cursor = connection.cursor() # Không cần dictionary=True

        # 3. Kiểm tra quyền admin: Kiểm tra xem người dùng hiện tại có phải là Admin trong nhóm của thành viên cần từ chối không
        # Tương tự như hàm approve_member, kiểm tra user hiện tại là admin trong cùng nhóm với member_id.
        cursor.execute(
            """
            SELECT id FROM members
            WHERE user_id = %s
              AND group_id = (SELECT group_id FROM members WHERE id = %s) -- Lấy group_id của thành viên cần từ chối
              AND role = 'Admin'
            """,
            (current_user_id, member_id) # Truyền user_id hiện tại và member_id cần từ chối
        )
        # Nếu không tìm thấy bản ghi (tức không phải admin trong nhóm này)
        if not cursor.fetchone():
            # Trả về lỗi 403 Forbidden
            return jsonify({"error": "You do not have permission to reject this member"}), 403

        # 4. Kiểm tra thành viên tồn tại và đang ở trạng thái Pending
        # Truy vấn lấy trạng thái hiện tại của thành viên cần từ chối
        cursor.execute(
            "SELECT status FROM members WHERE id = %s",
            (member_id,) # Truyền member_id cần từ chối
        )
        member = cursor.fetchone() # Lấy kết quả

        # Kiểm tra xem có tìm thấy thành viên không
        if not member:
            # Nếu không tìm thấy, trả về lỗi 404 Not Found
            return jsonify({"error": "Member not found"}), 404
        # Kiểm tra xem trạng thái có phải là 'Pending' không
        if member[0] != 'Pending':
            # Nếu không phải 'Pending', trả về lỗi 400 Bad Request
            return jsonify({"error": "Member is not in pending status"}), 400

        # 5. Xóa thành viên khỏi bảng members (vì yêu cầu bị từ chối)
        delete_member_query = """
            DELETE FROM members
            WHERE id = %s -- Xóa bản ghi thành viên có ID tương ứng
        """
        cursor.execute(delete_member_query, (member_id,)) # Thực thi câu lệnh DELETE

        # 6. Commit các thay đổi vào cơ sở dữ liệu và đóng kết nối
        connection.commit()

        # 7. Trả về thông báo thành công với mã 200 OK
        return jsonify({"message": "Member rejected successfully"}), 200

    except Exception as e:
        # Bắt các lỗi ngoại lệ và trả về mã 500 Internal Server Error
        logging.error(f"Error in reject_member for ID {member_id}: {e}", exc_info=True)
        # Rollback các thay đổi nếu có lỗi xảy ra trước khi commit
        if connection:
             connection.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        # Đảm bảo đóng cursor và kết nối nếu chúng đã được mở
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# API để tạo một nhóm mới
# Endpoint này thêm một nhóm vào bảng 'groups' và gán người tạo làm Admin
# Đồng thời kiểm tra giới hạn 1 nhóm/người dùng ở trạng thái Active.
@app.route('/api/group', methods=['POST'])
def create_group():
    """
    Tạo một nhóm mới.
    Người dùng tạo nhóm sẽ tự động được gán vai trò 'Admin' trong nhóm đó.
    Tạo mã nhóm (group_code) và mã ngẫu nhiên (random_code), sinh ảnh QR code và lưu vào static.
    Kiểm tra người dùng đã có nhóm Active nào khác chưa.

    Yêu cầu:
        Phương thức POST.
        Body request là JSON chứa:
        - group_name (str): Tên nhóm (bắt buộc, max 30 ký tự).
        Người dùng phải đăng nhập (user_id tồn tại trong session).

    Trả về:
        JSON: Thông tin nhóm vừa tạo (id, name, code, qr_image_url, member_count) nếu thành công (mã 201 Created).
        JSON: {'error': 'Authentication required'} nếu chưa đăng nhập (mã 401).
        JSON: {'error': 'Group name is required'} nếu thiếu tên nhóm (mã 400).
        JSON: {'error': 'Group name must not exceed 30 characters'} nếu tên nhóm quá dài (mã 400).
        JSON: {'error': 'Bạn chỉ có thể tham gia một nhóm'} nếu đã có nhóm Active (mã 400).
        JSON: {'error': 'Group name, code or random code already exists'} nếu trùng lặp (mã 400).
        JSON: {'error': 'Thông báo lỗi'} nếu có lỗi xảy ra (mã 500).
    """
    print("Starting create_group route") # Log debug
    connection = None # Khởi tạo biến kết nối
    cursor = None # Khởi tạo biến cursor
    try:
        # 1. Xác thực người dùng: Lấy ID người dùng hiện tại từ session
        current_user_id = get_current_user_id()
        if not current_user_id:
            # Nếu chưa đăng nhập, trả về lỗi 401 Unauthorized
            return jsonify({"error": "Authentication required"}), 401

        # 1.1. Kiểm tra giới hạn: Kiểm tra xem người dùng đã tham gia nhóm Active nào khác chưa
        # Một người dùng chỉ có thể là thành viên Active của một nhóm duy nhất tại một thời điểm.
        connection = get_db_connection() # Mở kết nối đầu tiên để kiểm tra
        cursor = connection.cursor()
        cursor.execute(
            """
            SELECT 1
            FROM members
            WHERE user_id = %s
              AND status = 'Active'
              AND (leave_date IS NULL OR leave_date > NOW()) -- Đảm bảo không tính nhóm đã rời đi
            """,
            (current_user_id,)
        )
        # Nếu tìm thấy bất kỳ bản ghi thành viên Active nào
        if cursor.fetchone():
            # Đóng kết nối tạm thời và trả về lỗi 400 Bad Request
            cursor.close()
            connection.close()
            return jsonify({"error": "Bạn chỉ có thể tham gia một nhóm"}), 400

        # Đóng kết nối tạm thời sau khi kiểm tra
        cursor.close()
        connection.close() # Đóng kết nối tạm


        # 2. Lấy và kiểm tra dữ liệu đầu vào từ body request
        data = request.get_json()
        group_name = data.get('group_name') # Lấy tên nhóm

        # Kiểm tra xem tên nhóm có được cung cấp không
        if not group_name:
            # Trả về lỗi 400 Bad Request nếu thiếu tên nhóm
            return jsonify({"error": "Group name is required"}), 400
        # Kiểm tra độ dài tên nhóm
        if len(group_name) > 30:
            # Trả về lỗi 400 Bad Request nếu tên nhóm quá dài
            return jsonify({"error": "Group name must not exceed 30 characters"}), 400

        # 3. Sinh mã nhóm (group_code) và mã ngẫu nhiên (random_code)
        # Sử dụng UUID để tạo mã duy nhất, cắt ngắn để dễ sử dụng
        group_code = str(uuid.uuid4())[:8] # Mã nhóm 8 ký tự
        random_code = str(uuid.uuid4())[:12] # Mã ngẫu nhiên 12 ký tự cho QR
        print(f"Generated group code: {group_code}, random code: {random_code}") # Log debug

        # 4. Tạo QR code từ random_code
        qr = qrcode.QRCode(box_size=6, border=2) # Cấu hình QR code
        qr.add_data(random_code) # Thêm dữ liệu (mã ngẫu nhiên) vào QR code
        qr.make(fit=True) # Tạo ma trận QR code
        img = qr.make_image(fill_color="black", back_color="white") # Tạo đối tượng ảnh QR

        # Lưu ảnh QR code vào thư mục static
        qr_folder = os.path.join(app.static_folder, 'qrcodes') # Đường dẫn đến thư mục qrcodes trong static
        os.makedirs(qr_folder, exist_ok=True) # Tạo thư mục nếu chưa tồn tại
        qr_filename = f"{group_code}.png" # Tên file ảnh QR (dựa trên group_code)
        qr_path = os.path.join(qr_folder, qr_filename) # Đường dẫn đầy đủ để lưu file
        img.save(qr_path) # Lưu ảnh
        qr_image_url = f"/static/qrcodes/{qr_filename}" # URL để truy cập ảnh QR từ trình duyệt
        print(f"Saved QR image at: {qr_path}") # Log debug

        # 5. Kết nối database và kiểm tra trùng lặp
        # Mở kết nối mới để thực hiện thao tác INSERT
        connection = get_db_connection()
        cursor = connection.cursor()
        # Kiểm tra xem tên nhóm, group_code hoặc random_code đã tồn tại chưa
        cursor.execute(
            "SELECT id FROM groups WHERE group_name = %s OR group_code = %s OR random_code = %s",
            (group_name, group_code, random_code)
        )
        # Nếu tìm thấy bất kỳ bản ghi nào
        if cursor.fetchone():
            # Đóng kết nối và trả về lỗi 400 Bad Request
            cursor.close()
            connection.close()
            # Optional: Xóa file QR vừa tạo nếu bị trùng lặp
            if os.path.exists(qr_path):
                 os.remove(qr_path)
                 print(f"Cleaned up duplicate QR file: {qr_path}")
            return jsonify({"error": "Group name, code or random code already exists"}), 400

        # 6. Insert thông tin nhóm mới vào bảng 'groups'
        insert_group_query = """
            INSERT INTO groups
              (group_name, group_code, random_code, qr_image_url, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s) -- Các giá trị sẽ được truyền qua tuple
        """
        now = datetime.now() # Lấy thời gian hiện tại cho created_at và updated_at
        cursor.execute(insert_group_query,
            (group_name, group_code, random_code, qr_image_url, now, now) # Truyền tuple các giá trị
        )
        group_id = cursor.lastrowid # Lấy ID của nhóm vừa được insert (auto-increment)

        # 7. Gán người dùng hiện tại làm Admin của nhóm vừa tạo
        # Thêm một bản ghi vào bảng 'members' cho người tạo nhóm với vai trò 'Admin' và trạng thái 'Active'
        insert_member_query = """
            INSERT INTO members
              (user_id, group_id, role, status, join_date, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s) -- Các giá trị sẽ được truyền qua tuple
        """
        cursor.execute(insert_member_query, (
            current_user_id, group_id, 'Admin', 'Active', # user_id, group_id, role, status
            now, now, now # join_date, created_at, updated_at
        ))

        # 8. Commit các thay đổi (thêm nhóm và thêm thành viên Admin) và đóng kết nối
        connection.commit()

        # 9. Trả về kết quả thành công với thông tin nhóm vừa tạo (mã 201 Created)
        return jsonify({
            "message": "Group created successfully",
            "group": {
                "id": group_id,
                "name": group_name,
                "code": group_code,
                "qr_image_url": qr_image_url,
                "member_count": 1 # Ban đầu nhóm chỉ có 1 thành viên (Admin)
            }
        }), 201

    except Exception as e:
        # Bắt các lỗi ngoại lệ và trả về mã 500 Internal Server Error
        logging.error(f"Error in create_group: {e}", exc_info=True)
        # Rollback các thay đổi nếu có lỗi xảy ra trước khi commit
        if connection:
             connection.rollback()
        # Xóa file QR nếu đã tạo thành công nhưng có lỗi khác xảy ra sau đó
        if 'qr_path' in locals() and os.path.exists(qr_path):
             os.remove(qr_path)
             print(f"Cleaned up QR file due to error: {qr_path}")
        return jsonify({"error": str(e)}), 500
    finally:
        # Đảm bảo đóng cursor và kết nối nếu chúng đã được mở
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# API để người dùng tham gia nhóm bằng mã nhóm (group_code)
# Endpoint này thêm người dùng vào bảng 'members' với status='Pending'
# Đồng thời kiểm tra giới hạn 1 nhóm/người dùng ở trạng thái Active hoặc Pending.
@app.route('/api/join-group', methods=['POST'])
def join_group():
    """
    Gửi yêu cầu tham gia một nhóm bằng mã nhóm (group_code).
    Thêm người dùng vào bảng 'members' với trạng thái 'Pending'.
    Kiểm tra người dùng đã ở trong nhóm Active/Pending nào khác chưa.

    Yêu cầu:
        Phương thức POST.
        Body request là JSON chứa:
        - group_code (str): Mã nhóm cần tham gia (bắt buộc).
        Người dùng phải đăng nhập (user_id tồn tại trong session).

    Trả về:
        JSON: {'message': 'Yêu cầu tham gia nhóm đã được gửi...', 'group_id': id} nếu thành công (mã 200).
        JSON: {'error': 'Authentication required'} nếu chưa đăng nhập (mã 401).
        JSON: {'error': 'Bạn chỉ có thể tham gia một nhóm tại một thời điểm'} nếu đã có nhóm Active/Pending (mã 400).
        JSON: {'error': 'Group code is required'} nếu thiếu mã nhóm (mã 400).
        JSON: {'error': 'Invalid group code'} nếu mã nhóm không tồn tại (mã 404).
        JSON: {'error': 'Bạn đã là thành viên của nhóm này'} nếu đã là thành viên (mã 400).
        JSON: {'error': 'Thông báo lỗi'} nếu có lỗi xảy ra (mã 500).
    """
    connection = None # Khởi tạo biến kết nối
    cursor = None # Khởi tạo biến cursor
    try:
        # 1. Xác thực người dùng: Lấy ID người dùng hiện tại từ session
        current_user_id = get_current_user_id()
        if not current_user_id:
            # Nếu chưa đăng nhập, trả về lỗi 401 Unauthorized
            return jsonify({"error": "Authentication required"}), 401

        # 1.1. Kiểm tra giới hạn: Kiểm tra user đã tham gia hoặc đang chờ duyệt nhóm nào chưa
        # Một người dùng chỉ có thể ở trong 1 nhóm (Active hoặc Pending) tại một thời điểm.
        connection = get_db_connection() # Mở kết nối đầu tiên để kiểm tra
        cursor = connection.cursor()
        cursor.execute(
            """
            SELECT 1
            FROM members
            WHERE user_id = %s
              AND status IN ('Active', 'Pending') -- Kiểm tra cả Active và Pending
              AND (leave_date IS NULL OR leave_date > NOW())
            """,
            (current_user_id,)
        )
        # Nếu tìm thấy bất kỳ bản ghi thành viên Active hoặc Pending nào
        if cursor.fetchone():
            # Đóng kết nối tạm thời và trả về lỗi 400 Bad Request
            cursor.close()
            connection.close()
            return jsonify({"error": "Bạn chỉ có thể tham gia một nhóm tại một thời điểm"}), 400

        # Đóng kết nối tạm thời sau khi kiểm tra
        cursor.close()
        connection.close() # Đóng kết nối tạm

        # 2. Lấy và kiểm tra dữ liệu đầu vào (group_code)
        data = request.get_json()
        group_code = data.get('group_code') # Lấy mã nhóm từ body request

        # Kiểm tra xem mã nhóm có được cung cấp không
        if not group_code:
             # Nếu thiếu mã nhóm, trả về lỗi 400 Bad Request. Cần đóng kết nối tạm trước khi return.
             # Đảm bảo cursor và connection đã đóng nếu mở ở bước 1.1
             return jsonify({"error": "Group code is required"}), 400

        # 3. Kiểm tra mã nhóm tồn tại trong bảng 'groups'
        # Mở kết nối mới để thực hiện các thao tác tiếp theo
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute(
            "SELECT id FROM groups WHERE group_code = %s",
            (group_code,) # Truyền mã nhóm
        )
        row = cursor.fetchone() # Lấy kết quả

        # Nếu không tìm thấy nhóm nào với mã này
        if not row:
            # Đóng kết nối và trả về lỗi 404 Not Found
            cursor.close()
            connection.close()
            return jsonify({"error": "Invalid group code"}), 404
        group_id = row[0] # Lấy group_id từ kết quả truy vấn

        # 4. Kiểm tra xem người dùng hiện tại đã là thành viên (Active hoặc Pending) của nhóm này chưa
        # Kiểm tra trùng lặp trong cùng nhóm.
        cursor.execute(
            "SELECT 1 FROM members WHERE user_id = %s AND group_id = %s AND status IN ('Active', 'Pending')",
            (current_user_id, group_id)
        )
        # Nếu tìm thấy bất kỳ bản ghi thành viên nào cho user này trong nhóm này (Active hoặc Pending)
        if cursor.fetchone():
            # Đóng kết nối và trả về lỗi 400 Bad Request
            cursor.close()
            connection.close()
            return jsonify({"error": "Bạn đã là thành viên của nhóm này"}), 400

        # 5. Thêm người dùng vào nhóm với status = 'Pending'
        # Tạo một bản ghi mới trong bảng 'members'
        insert_member_query = """
            INSERT INTO members
              (user_id, group_id, role, status, join_date, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s) -- Các giá trị sẽ được truyền qua tuple
        """
        now = datetime.now() # Lấy thời gian hiện tại cho join_date, created_at, updated_at
        cursor.execute(insert_member_query, (
            current_user_id, group_id, 'Member', 'Pending', # user_id, group_id, role (mặc định Member), status
            now, now, now # join_date, created_at, updated_at
        ))

        # 6. Commit các thay đổi (thêm bản ghi thành viên Pending) và đóng kết nối
        connection.commit()

        # 7. Trả về kết quả thành công với thông báo và group_id (mã 200 OK)
        return jsonify({
            "message": "Yêu cầu tham gia nhóm đã được gửi. Vui lòng chờ duyệt.",
            "group_id": group_id # Trả về group_id của nhóm đã gửi yêu cầu
        }), 200

    except Exception as e:
        # Bắt các lỗi ngoại lệ và trả về mã 500 Internal Server Error
        logging.error(f"Error in join_group: {e}", exc_info=True)
        # Rollback các thay đổi nếu có lỗi xảy ra trước khi commit
        if connection:
             connection.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        # Đảm bảo đóng cursor và kết nối nếu chúng đã được mở
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# API lấy danh sách nội quy của nhóm mà người dùng hiện tại đang Active
# Endpoint này tự động tìm group_id và member_id của người dùng.
@app.route('/api/groups/my/rules', methods=['GET'])
def get_my_group_rules():
    """
    Lấy danh sách nội quy của nhóm mà người dùng hiện tại là thành viên Active.
    Đồng thời trả về group_id và member_id của người dùng trong nhóm đó.

    Yêu cầu:
        Phương thức GET.
        Người dùng phải đăng nhập (user_id tồn tại trong session).
        Người dùng phải là thành viên Active của ít nhất một nhóm.

    Trả về:
        JSON: {'group_id': id, 'member_id': id, 'rules': [...]} nếu thành công (mã 200).
        JSON: {'error': 'Unauthorized'} nếu chưa đăng nhập (mã 401).
        JSON: {'error': 'User is not a member of any group'} nếu không thuộc nhóm Active nào (mã 403).
        JSON: {'error': 'Thông báo lỗi'} nếu có lỗi xảy ra (mã 500).
    """
    conn = None # Khởi tạo biến kết nối
    cursor = None # Khởi tạo biến cursor
    try:
        # 1. Xác thực người dùng: Lấy ID người dùng hiện tại từ session
        user_id = get_current_user_id()
        if not user_id:
             # Nếu chưa đăng nhập, trả về lỗi 401 Unauthorized
            return jsonify({'error': 'Unauthorized'}), 401

        # Lấy kết nối đến cơ sở dữ liệu
        conn = get_db_connection()
        # Tạo cursor để thực thi truy vấn, kết quả trả về dạng dictionary
        cursor = conn.cursor(dictionary=True)

        # 2. Tìm group_id và member_id của người dùng hiện tại trong nhóm Active đầu tiên tìm thấy
        # Giả định người dùng chỉ quan tâm đến nội quy của một nhóm Active tại một thời điểm.
        cursor.execute("""
            SELECT m.group_id, m.id AS member_id
            FROM members m
            WHERE m.user_id = %s AND m.status = 'Active' -- Lọc theo user_id và trạng thái Active
            LIMIT 1 -- Chỉ lấy bản ghi đầu tiên
        """, (user_id,))
        m = cursor.fetchone() # Lấy kết quả

        # 3. Kiểm tra xem người dùng có thuộc nhóm Active nào không
        if not m:
            # Nếu không tìm thấy, trả về lỗi 403 Forbidden (hoặc 404 Not Found, tùy ngữ cảnh)
            return jsonify({'error': 'User is not a member of any active group'}), 403 # Sửa lại thông báo cho rõ hơn

        # Lấy group_id và member_id từ kết quả tìm được
        group_id = m['group_id']
        member_id = m['member_id']

        # 4. Lấy danh sách nội quy của nhóm đã tìm được
        # Truy vấn lấy các nội quy từ bảng 'group_rules' cho nhóm 'group_id'
        # JOIN với 'members' và 'users' để lấy thông tin người tạo nội quy
        # Sử dụng subquery để kiểm tra xem người dùng hiện tại đã Like nội quy đó chưa ('liked')
        query = """
            SELECT r.id, r.title, r.content, r.privacy, r.like_count, r.comment_count,
                   r.created_at, m.id AS member_id, u.full_name, m.avatar,
                   EXISTS(SELECT 1 FROM group_rule_likes l
                          WHERE l.rule_id = r.id AND l.member_id = %s) AS liked -- Kiểm tra xem người dùng hiện tại (member_id của họ) đã like rule này chưa
            FROM group_rules r
            JOIN members m ON r.member_id = m.id -- Nối với members để lấy thông tin người tạo (member_id)
            JOIN users u ON m.user_id = u.id     -- Nối với users để lấy full_name của người tạo
            WHERE r.group_id = %s -- Lọc theo group_id của nhóm
            ORDER BY r.created_at DESC -- Sắp xếp nội quy theo thời gian tạo mới nhất
        """
        # Thực thi truy vấn, truyền member_id của user hiện tại (để kiểm tra like) và group_id
        cursor.execute(query, (member_id, group_id))
        rules = cursor.fetchall() # Lấy tất cả các nội quy

        # 5. Đóng cursor và kết nối
        cursor.close()
        conn.close()

        # 6. Trả về kết quả bao gồm group_id, member_id và danh sách nội quy
        return jsonify({
            'group_id': group_id,
            'member_id': member_id,
            'rules': rules
        }), 200

    except Exception as e:
        # Bắt các lỗi ngoại lệ và trả về mã 500 Internal Server Error
        logging.error(f"Error fetching my group rules for user {user_id}: {e}", exc_info=True)
        return jsonify({'error': f'Đã xảy ra lỗi: {e}'}), 500
    finally:
        # Đảm bảo đóng cursor và kết nối nếu chúng đã được mở
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()


# API: đếm số lượng thành viên Active trong một nhóm
@app.route('/api/group/<int:group_id>/members/count', methods=['GET'])
def get_member_count(group_id):
    """
    Đếm tổng số thành viên có trạng thái 'Active' trong một nhóm cụ thể.

    Args:
        group_id (int): ID của nhóm cần đếm thành viên.

    Yêu cầu:
        Phương thức GET.

    Trả về:
        JSON: {'total_members': count} số lượng thành viên Active (mã 200).
        JSON: {'error': 'Thông báo lỗi'} nếu có lỗi xảy ra (mã 500).
    """
    conn = None # Khởi tạo biến kết nối
    cursor = None # Khởi tạo biến cursor
    try:
        # Lấy kết nối đến cơ sở dữ liệu
        conn = get_db_connection()
        cursor = conn.cursor() # Không cần dictionary=True ở đây

        # Truy vấn đếm số lượng bản ghi trong bảng 'members'
        # Lọc theo group_id và trạng thái 'Active'
        cursor.execute(
            'SELECT COUNT(*) FROM members WHERE group_id=%s AND status="Active"',
            (group_id,) # Truyền group_id
        )
        total = cursor.fetchone()[0] # Lấy kết quả đếm (là phần tử đầu tiên của tuple)

        # 3. Đóng cursor và kết nối
        cursor.close()
        conn.close()

        # 4. Trả về kết quả dưới dạng JSON
        return jsonify({'total_members': total}), 200

    except Exception as e:
        # Bắt các lỗi ngoại lệ và trả về mã 500 Internal Server Error
        logging.error(f"Error fetching member count for group {group_id}: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500
    finally:
        # Đảm bảo đóng cursor và kết nối nếu chúng đã được mở
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()
# ============================= #
#       ROUTING & Nội Quy      #
# ============================= #

# 1. Lấy danh sách nội quy của nhóm (chỉ khi user là thành viên)
@app.route('/api/groups/<int:group_id>/rules', methods=['GET'])
def get_group_rules(group_id):
    """
    Lấy danh sách nội quy của một nhóm cụ thể.
    Chỉ cho phép thành viên của nhóm truy cập.

    Args:
        group_id (int): ID của nhóm cần lấy nội quy.

    Returns:
        JSON: Danh sách các nội quy của nhóm hoặc thông báo lỗi.
    """
    # Lấy ID người dùng hiện tại
    user_id = get_current_user_id()
    # Kiểm tra xem người dùng đã đăng nhập chưa
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401 # 401: Lỗi xác thực

    # Lấy kết nối cơ sở dữ liệu
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True) # Sử dụng dictionary=True để lấy kết quả dưới dạng dictionary

    # Kiểm tra user có trong nhóm không và trạng thái là 'Active'
    cursor.execute("""
        SELECT m.id AS member_id FROM members m
        WHERE m.group_id = %s AND m.user_id = %s AND m.status = 'Active'
    """, (group_id, user_id))

    member = cursor.fetchone()
    # Nếu không tìm thấy bản ghi thành viên hoạt động
    if not member:
        cursor.close()
        conn.close()
        return jsonify({'error': 'User is not a member of this group'}), 403 # 403: Lỗi cấm truy cập

    # Lấy danh sách nội quy của nhóm
    # Truy vấn kết hợp bảng group_rules, members, users để lấy thông tin chi tiết
    # Sử dụng EXISTS để kiểm tra xem người dùng hiện tại đã like nội quy đó chưa
    query = """
        SELECT r.id, r.title, r.content, r.privacy, r.like_count, r.comment_count,
               r.created_at, m.id AS member_id, u.full_name, m.avatar,
               EXISTS(SELECT 1 FROM group_rule_likes l
                      WHERE l.rule_id = r.id AND l.member_id = %s) AS liked
        FROM group_rules r
        JOIN members m ON r.member_id = m.id
        JOIN users u ON m.user_id = u.id
        WHERE r.group_id = %s
        ORDER BY r.created_at DESC # Sắp xếp theo thời gian tạo giảm dần
    """
    cursor.execute(query, (member['member_id'], group_id))
    rules = cursor.fetchall() # Lấy tất cả các bản ghi kết quả

    # Đóng kết nối cơ sở dữ liệu
    cursor.close()
    conn.close()

    # Trả về danh sách nội quy dưới dạng JSON
    return jsonify(rules), 200 # 200: Thành công

# 2. Tạo bài nội quy mới
@app.route('/api/groups/<int:group_id>/rules', methods=['POST'])
def create_group_rule(group_id):
    """
    Tạo một bài nội quy mới cho nhóm.
    Chỉ cho phép thành viên hoạt động của nhóm tạo nội quy.

    Args:
        group_id (int): ID của nhóm cần tạo nội quy.

    Returns:
        JSON: ID của nội quy mới được tạo hoặc thông báo lỗi.
    """
    # Lấy ID người dùng hiện tại
    user_id = get_current_user_id()
    # Kiểm tra xem người dùng đã đăng nhập chưa
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401 # 401: Lỗi xác thực

    # Lấy dữ liệu từ request body (dạng JSON)
    data = request.get_json()
    title = data.get('title')
    content = data.get('content')
    privacy = data.get('privacy', 'public') # Mặc định là 'public' nếu không được cung cấp

    # Kiểm tra các trường bắt buộc
    if not title or not content:
        return jsonify({'error': 'Title and content are required'}), 400 # 400: Lỗi yêu cầu không hợp lệ

    # Lấy kết nối cơ sở dữ liệu
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Lấy member_id của user trong nhóm với trạng thái 'Active'
    cursor.execute("""
        SELECT id FROM members
        WHERE group_id = %s AND user_id = %s AND status = 'Active'
    """, (group_id, user_id))

    member = cursor.fetchone()
    # Nếu không tìm thấy bản ghi thành viên hoạt động
    if not member:
        cursor.close()
        conn.close()
        return jsonify({'error': 'User is not an active member of this group'}), 403 # 403: Lỗi cấm truy cập

    # Chèn bản ghi nội quy mới vào bảng group_rules
    query = """
        INSERT INTO group_rules (group_id, member_id, title, content, privacy)
        VALUES (%s, %s, %s, %s, %s)
    """
    cursor.execute(query, (group_id, member['id'], title, content, privacy))
    conn.commit() # Lưu thay đổi vào cơ sở dữ liệu

    # Lấy ID của bản ghi vừa được chèn
    new_id = cursor.lastrowid

    # Đóng kết nối cơ sở dữ liệu
    cursor.close()
    conn.close()

    # Trả về ID của nội quy mới
    return jsonify({'id': new_id}), 201 # 201: Đã tạo thành công

# 3. Like / Unlike bài nội quy
@app.route('/api/rules/<int:rule_id>/like', methods=['POST'])
def toggle_like_rule(rule_id):
    """
    Thực hiện like hoặc unlike một bài nội quy.

    Args:
        rule_id (int): ID của nội quy cần like/unlike.

    Returns:
        JSON: Trạng thái hành động ('liked' hoặc 'unliked') hoặc thông báo lỗi.
    """
    # Lấy dữ liệu từ request body
    data = request.get_json()
    member_id = data.get('member_id') # ID thành viên thực hiện hành động like/unlike

    # Kiểm tra member_id có được cung cấp không
    if not member_id:
         return jsonify({'error': 'member_id is required'}), 400 # 400: Lỗi yêu cầu không hợp lệ

    # Lấy kết nối cơ sở dữ liệu
    conn = get_db_connection()
    cursor = conn.cursor()

    # Kiểm tra xem thành viên đã like nội quy này trước đó chưa
    cursor.execute("SELECT id FROM group_rule_likes WHERE rule_id=%s AND member_id=%s", (rule_id, member_id))
    existing = cursor.fetchone()

    if existing:
        # Nếu đã like trước đó, thực hiện unlike (xóa bản ghi like)
        cursor.execute("DELETE FROM group_rule_likes WHERE id=%s", (existing[0],))
        # Giảm số lượng like của nội quy
        cursor.execute("UPDATE group_rules SET like_count = like_count - 1 WHERE id=%s", (rule_id,))
        action = 'unliked' # Đặt trạng thái hành động là 'unliked'
    else:
        # Nếu chưa like, thực hiện like (thêm bản ghi like mới)
        cursor.execute("INSERT INTO group_rule_likes (rule_id, member_id) VALUES (%s, %s)", (rule_id, member_id))
        # Tăng số lượng like của nội quy
        cursor.execute("UPDATE group_rules SET like_count = like_count + 1 WHERE id=%s", (rule_id,))
        action = 'liked' # Đặt trạng thái hành động là 'liked'

    conn.commit() # Lưu thay đổi vào cơ sở dữ liệu

    # Đóng kết nối cơ sở dữ liệu
    cursor.close()
    conn.close()

    # Trả về trạng thái hành động
    return jsonify({'action': action}), 200 # 200: Thành công

# 4. Lấy bình luận của một bài nội quy
@app.route('/api/rules/<int:rule_id>/comments', methods=['GET'])
def get_rule_comments(rule_id):
    """
    Lấy danh sách bình luận của một bài nội quy.

    Args:
        rule_id (int): ID của nội quy cần lấy bình luận.

    Returns:
        JSON: Danh sách các bình luận của nội quy hoặc thông báo lỗi.
    """
    # Lấy kết nối cơ sở dữ liệu
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Truy vấn lấy danh sách bình luận, kết hợp với bảng members và users
    # để lấy thông tin người bình luận
    query = """
        SELECT c.id, c.content, c.like_count, c.created_at,
               m.id AS member_id, u.full_name, m.avatar
        FROM group_rule_comments c
        JOIN members m ON c.member_id = m.id
        JOIN users u ON m.user_id = u.id
        WHERE c.rule_id = %s
        ORDER BY c.created_at ASC # Sắp xếp theo thời gian tạo tăng dần
    """
    cursor.execute(query, (rule_id,))
    comments = cursor.fetchall() # Lấy tất cả các bản ghi kết quả

    # Đóng kết nối cơ sở dữ liệu
    cursor.close()
    conn.close()

    # Trả về danh sách bình luận dưới dạng JSON
    return jsonify(comments), 200 # 200: Thành công

# 5. Thêm bình luận mới
@app.route('/api/rules/<int:rule_id>/comments', methods=['POST'])
def add_rule_comment(rule_id):
    """
    Thêm một bình luận mới vào bài nội quy.

    Args:
        rule_id (int): ID của nội quy cần thêm bình luận.

    Returns:
        JSON: ID của bình luận mới được tạo hoặc thông báo lỗi.
    """
    # Lấy dữ liệu từ request body
    data = request.get_json()
    member_id = data.get('member_id') # ID thành viên tạo bình luận
    content = data.get('content') # Nội dung bình luận

    # Kiểm tra các trường bắt buộc
    if not member_id or not content:
         return jsonify({'error': 'member_id and content are required'}), 400 # 400: Lỗi yêu cầu không hợp lệ

    # Lấy kết nối cơ sở dữ liệu
    conn = get_db_connection()
    cursor = conn.cursor()

    # Chèn bản ghi bình luận mới vào bảng group_rule_comments
    cursor.execute(
        "INSERT INTO group_rule_comments (rule_id, member_id, content) VALUES (%s, %s, %s)",
        (rule_id, member_id, content)
    )
    # Tăng số lượng bình luận của nội quy
    cursor.execute(
        "UPDATE group_rules SET comment_count = comment_count + 1 WHERE id=%s",
        (rule_id,)
    )
    conn.commit() # Lưu thay đổi vào cơ sở dữ liệu

    # Lấy ID của bản ghi vừa được chèn
    new_id = cursor.lastrowid

    # Đóng kết nối cơ sở dữ liệu
    cursor.close()
    conn.close()

    # Trả về ID của bình luận mới
    return jsonify({'id': new_id}), 201 # 201: Đã tạo thành công

# 6. Like / Unlike bình luận
@app.route('/api/comments/<int:comment_id>/like', methods=['POST'])
def toggle_like_comment(comment_id):
    """
    Thực hiện like hoặc unlike một bình luận.

    Args:
        comment_id (int): ID của bình luận cần like/unlike.

    Returns:
        JSON: Trạng thái hành động ('liked' hoặc 'unliked') hoặc thông báo lỗi.
    """
    # Lấy dữ liệu từ request body
    data = request.get_json()
    member_id = data.get('member_id') # ID thành viên thực hiện hành động like/unlike

    # Kiểm tra member_id có được cung cấp không
    if not member_id:
         return jsonify({'error': 'member_id is required'}), 400 # 400: Lỗi yêu cầu không hợp lệ


    # Lấy kết nối cơ sở dữ liệu
    conn = get_db_connection()
    cursor = conn.cursor()

    # Kiểm tra xem thành viên đã like bình luận này trước đó chưa
    cursor.execute("SELECT id FROM group_rule_comment_likes WHERE comment_id=%s AND member_id=%s", (comment_id, member_id))
    existing = cursor.fetchone()

    if existing:
        # Nếu đã like trước đó, thực hiện unlike (xóa bản ghi like)
        cursor.execute("DELETE FROM group_rule_comment_likes WHERE id=%s", (existing[0],))
        # Giảm số lượng like của bình luận
        cursor.execute("UPDATE group_rule_comments SET like_count = like_count - 1 WHERE id=%s", (comment_id,))
        action = 'unliked' # Đặt trạng thái hành động là 'unliked'
    else:
        # Nếu chưa like, thực hiện like (thêm bản ghi like mới)
        cursor.execute("INSERT INTO group_rule_comment_likes (comment_id, member_id) VALUES (%s, %s)", (comment_id, member_id))
        # Tăng số lượng like của bình luận
        cursor.execute("UPDATE group_rule_comments SET like_count = like_count + 1 WHERE id=%s", (comment_id,))
        action = 'liked' # Đặt trạng thái hành động là 'liked'

    conn.commit() # Lưu thay đổi vào cơ sở dữ liệu

    # Đóng kết nối cơ sở dữ liệu
    cursor.close()
    conn.close()

    # Trả về trạng thái hành động
    return jsonify({'action': action}), 200 # 200: Thành công
# ============================= #

#       ROUTING & Bỏ Phiếu      #

# ============================= #
# Hiển thị trang bỏ phiếu
from flask import Blueprint, jsonify, request, session, render_template
from datetime import datetime, date
from mysql.connector import IntegrityError
# Giả định bạn đã định nghĩa `get_db_connection` ở đâu đó
# Nếu không, hãy đảm bảo hàm này được import hoặc định nghĩa

# Route: Trang bình chọn
@app.route('/vote')
def vote_page():
    """
    Render trang HTML cho phép người dùng bỏ phiếu.
    Yêu cầu người dùng đã đăng nhập.
    """
    user_id = session.get('user_id', 1)  # Thay thế logic thực tế
    group_id = session.get('group_id', 1)  # Thay thế logic thực tế

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            'SELECT id FROM members WHERE user_id=%s AND group_id=%s',
            (user_id, group_id)
        )
        result = cursor.fetchone()
        if result:
            member_id = result[0]
        else:
            member_id = None
            print(f"Error: Member ID not found for user_id={user_id} in group_id={group_id}")
    except Exception as e:
        print(f"Database error: {e}")
        member_id = None
    finally:
        cursor.close()
        conn.close()

    return render_template('binhchon.html', group_id=group_id, member_id=member_id)

# Route: Lấy danh sách mục bình chọn
@app.route('/api/group/<int:group_id>/vote_items', methods=['GET'])
def get_vote_items(group_id):
    vote_date = request.args.get('date')  # Không mặc định là today

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Nếu có vote_date, lọc theo ngày; nếu không, lấy tất cả
        if vote_date:
            cursor.execute(
                '''SELECT vi.id, vi.name, vi.type, vi.vote_date
                   FROM vote_items vi
                   WHERE vi.group_id=%s AND vi.vote_date=%s''',
                (group_id, vote_date)
            )
        else:
            cursor.execute(
                '''SELECT vi.id, vi.name, vi.type, vi.vote_date
                   FROM vote_items vi
                   WHERE vi.group_id=%s''',
                (group_id,)
            )
        items = cursor.fetchall()

        for item in items:
            cursor.execute(
                'SELECT COUNT(*) AS votes FROM votes WHERE vote_item_id=%s',
                (item['id'],)
            )
            row = cursor.fetchone()
            item['votes'] = row['votes'] if row and row['votes'] is not None else 0

            cursor.execute(
                '''SELECT v.member_id
                   FROM votes v
                   WHERE v.vote_item_id=%s''',
                (item['id'],)
            )
            voters = cursor.fetchall()
            item['voters'] = [voter['member_id'] for voter in voters] if voters else []

    except Exception as e:
        print(f"Database error fetching vote items: {e}")
        return jsonify({'error': 'Đã xảy ra lỗi khi lấy dữ liệu bỏ phiếu'}), 500

    finally:
        cursor.close()
        conn.close()

    return jsonify(items), 200
# Route: Thêm mục bình chọn
@app.route('/api/group/<int:group_id>/vote_items', methods=['POST'])
def add_vote_item(group_id):
    """
    Thêm một mục bỏ phiếu mới vào nhóm.

    Args:
        group_id (int): ID của nhóm.

    Returns:
        JSON: ID của mục bỏ phiếu mới được tạo hoặc thông báo lỗi.
    """
    data = request.json
    name = data.get('name')
    type_ = data.get('type')
    vote_date = data.get('vote_date')
    member_id = data.get('member_id')

    if not all([name, type_, vote_date, member_id]):
        return jsonify({'error': 'Thiếu các trường bắt buộc (name, type, vote_date, member_id)'}), 400

    if type_ not in ['food', 'activity']:
        return jsonify({'error': 'Loại không hợp lệ, phải là "food" hoặc "activity"'}), 400

    try:
        datetime.strptime(vote_date, '%Y-%m-%d')
    except ValueError:
        return jsonify({'error': 'Định dạng ngày không hợp lệ (phải là YYYY-MM-DD)'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT id FROM groups WHERE id = %s", (group_id,))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': 'Nhóm không tồn tại'}), 404

        cursor.execute(
            "SELECT id FROM members WHERE id = %s AND group_id = %s AND status = 'Active'",
            (member_id, group_id)
        )
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': 'Thành viên không hợp lệ hoặc không thuộc nhóm'}), 400

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

    except IntegrityError as e:
        if conn and conn.is_connected():
            cursor.close()
            conn.close()
        print(f"Integrity error adding vote item: {e}")
        return jsonify({'error': f'Lỗi cơ sở dữ liệu: {str(e)}'}), 500
    except Exception as e:
        if conn and conn.is_connected():
            cursor.close()
            conn.close()
        print(f"Unexpected error adding vote item: {e}")
        return jsonify({'error': f'Đã xảy ra lỗi: {str(e)}'}), 500

# Route: Bỏ phiếu
@app.route('/api/vote', methods=['POST'])
def cast_vote():
    """
    Thực hiện bỏ phiếu cho một mục bỏ phiếu cụ thể.

    Returns:
        JSON: Thông báo thành công hoặc thông báo lỗi.
    """
    data = request.json
    vote_item_id = data.get('vote_item_id')
    member_id = data.get('member_id')

    if not all([vote_item_id, member_id]):
        return jsonify({'error': 'Thiếu các trường bắt buộc (vote_item_id, member_id)'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Kiểm tra vote_item_id tồn tại và lấy group_id
        cursor.execute("SELECT group_id FROM vote_items WHERE id = %s", (vote_item_id,))
        vote_item = cursor.fetchone()
        if not vote_item:
            cursor.close()
            conn.close()
            return jsonify({'error': 'Mục bỏ phiếu không tồn tại'}), 404
        group_id = vote_item[0]

        # Kiểm tra member_id hợp lệ
        cursor.execute(
            "SELECT id FROM members WHERE id = %s AND group_id = %s AND status = 'Active'",
            (member_id, group_id)
        )
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': 'Thành viên không hợp lệ hoặc không thuộc nhóm'}), 400

        # Thêm lượt bỏ phiếu
        cursor.execute(
            'INSERT INTO votes (vote_item_id, member_id) VALUES (%s, %s)',
            (vote_item_id, member_id)
        )
        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({'success': True}), 201

    except IntegrityError as e:
        if conn and conn.is_connected():
            cursor.close()
            conn.close()
        print(f"Integrity error casting vote: {e}")
        if "Duplicate entry" in str(e):
            return jsonify({'error': 'Bạn đã bỏ phiếu cho mục này rồi'}), 409
        return jsonify({'error': f'Lỗi cơ sở dữ liệu: {str(e)}'}), 500
    except Exception as e:
        if conn and conn.is_connected():
            cursor.close()
            conn.close()
        print(f"Unexpected error casting vote: {e}")
        return jsonify({'error': f'Đã xảy ra lỗi: {str(e)}'}), 500

# Route: Lấy danh sách các vote đang mở
@app.route('/api/open-votes', methods=['GET'])
def get_open_votes():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"error": "Thiếu user_id"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    current_date = datetime.now().date()

    query = """
        SELECT vi.id, vi.name
        FROM vote_items vi
        INNER JOIN members m ON vi.group_id = m.group_id
        WHERE m.user_id = %s
          AND m.status = 'Active'
          AND vi.vote_date >= %s
        ORDER BY vi.vote_date ASC
    """
    cursor.execute(query, (user_id, current_date))
    open_votes = cursor.fetchall()
    cursor.close()
    conn.close()

    vote_list = [row[1] for row in open_votes]
    return jsonify({
        "message": f"Đang mở: {len(vote_list)} cuộc bình chọn",
        "votes": vote_list
    }), 200
# ============================= #

#       ROUTING & Vật Phẩm      #

# ============================= #

# Item Categories Routes (Các Tuyến API Danh Mục Vật Phẩm)
# Định nghĩa các tuyến API cho việc quản lý danh mục vật phẩm.

@app.route('/api/categories', methods=['GET'])
def get_categories():
    # Lấy danh sách các danh mục vật phẩm cho nhóm của người dùng hiện tại.

    # Lấy ID người dùng hiện tại từ phiên làm việc hoặc cơ chế xác thực khác.
    user_id = get_current_user_id()
    # Kiểm tra xem người dùng đã đăng nhập chưa.
    if not user_id:
        # Nếu chưa đăng nhập, trả về lỗi 401 Unauthorized.
        return jsonify({'error': 'User not logged in'}), 401

    # Kết nối đến cơ sở dữ liệu.
    conn = get_db_connection()
    # Tạo con trỏ để thực thi các truy vấn, trả về kết quả dưới dạng dictionary.
    cursor = conn.cursor(dictionary=True)

    # Truy vấn để tìm group_id của người dùng hiện tại trong bảng members.
    # Chỉ lấy thành viên có trạng thái 'Active' (Hoạt động).
    cursor.execute('SELECT group_id FROM members WHERE user_id = %s AND status = %s LIMIT 1', (user_id, 'Active'))
    # Lấy kết quả truy vấn đầu tiên (nếu có).
    member = cursor.fetchone()

    # Kiểm tra xem người dùng có thuộc nhóm hoạt động nào không.
    if not member:
        # Đóng con trỏ và kết nối DB.
        cursor.close()
        conn.close()
        # Nếu không thuộc nhóm nào, trả về lỗi 404 Not Found.
        return jsonify({'error': 'User is not part of any active group'}), 404

    # Lấy group_id từ kết quả truy vấn.
    group_id = member['group_id']
    # Truy vấn tất cả danh mục vật phẩm thuộc group_id này từ bảng item_categories.
    cursor.execute('SELECT * FROM item_categories WHERE group_id = %s', (group_id,))
    # Lấy tất cả các danh mục tìm được.
    categories = cursor.fetchall()

    # Đóng con trỏ và kết nối DB.
    cursor.close()
    conn.close()
    # Trả về danh sách các danh mục dưới dạng JSON.
    return jsonify(categories)

@app.route('/api/categories', methods=['POST'])
def create_category():
    # Tạo một danh mục vật phẩm mới cho nhóm của người dùng hiện tại.

    # Lấy ID người dùng hiện tại.
    user_id = get_current_user_id()
    # Kiểm tra đăng nhập.
    if not user_id:
        return jsonify({'error': 'User not logged in'}), 401

    # Lấy dữ liệu JSON được gửi trong yêu cầu POST.
    data = request.get_json()

    # Kết nối DB.
    conn = get_db_connection()
    # Tạo con trỏ.
    cursor = conn.cursor()

    # Lấy group_id của người dùng hiện tại.
    cursor.execute('SELECT group_id FROM members WHERE user_id = %s AND status = %s LIMIT 1', (user_id, 'Active'))
    member = cursor.fetchone()

    # Kiểm tra xem người dùng có thuộc nhóm hoạt động nào không.
    if not member:
        # Đóng con trỏ và kết nối DB.
        cursor.close()
        conn.close()
        # Trả về lỗi 404.
        return jsonify({'error': 'User is not part of any active group'}), 404

    # Lấy group_id.
    group_id = member[0] # Lưu ý: Nếu không dùng dictionary=True, kết quả fetchone() là tuple.

    # Chèn danh mục mới vào bảng item_categories.
    cursor.execute(
        'INSERT INTO item_categories (group_id, name) VALUES (%s, %s)',
        (group_id, data['name']) # Lấy tên danh mục từ dữ liệu request.
    )
    # Lưu các thay đổi vào cơ sở dữ liệu.
    conn.commit()
    # Lấy ID của hàng vừa được chèn.
    category_id = cursor.lastrowid
    # Đóng con trỏ và kết nối DB.
    cursor.close()
    conn.close()
    # Trả về thông tin về danh mục vừa tạo và mã trạng thái 201 Created.
    return jsonify({'id': category_id, 'name': data['name']}), 201

# Shared Items Routes (Các Tuyến API Vật Phẩm Chia Sẻ)
# Định nghĩa các tuyến API cho việc quản lý các vật phẩm được chia sẻ trong nhóm.

@app.route('/api/items', methods=['GET'])
def get_items():
    # Lấy danh sách các vật phẩm được chia sẻ trong nhóm của người dùng hiện tại.

    # Lấy user_id từ session.
    user_id = session.get('user_id')
    # Kiểm tra xem người dùng đã đăng nhập chưa.
    if not user_id:
        # Nếu chưa, trả về danh sách rỗng và mã trạng thái 401 Unauthorized.
        return jsonify([]), 401  # Unauthorized

    # Kết nối DB.
    conn = get_db_connection()
    # Tạo con trỏ với dictionary=True.
    cursor = conn.cursor(dictionary=True)

    # Lấy group_id dựa trên user_id từ bảng members.
    cursor.execute("SELECT group_id FROM members WHERE user_id = %s", (user_id,))
    result = cursor.fetchone()
    # Nếu người dùng không thuộc nhóm nào, trả về danh sách rỗng.
    if not result:
        cursor.close()
        conn.close()
        return jsonify([])

    # Lấy group_id.
    group_id = result['group_id']
    # In thông tin group_id (để debug).
    print(f"Using group_id from session: {group_id}")

    # Truy vấn các vật phẩm từ bảng shared_items thuộc group_id này.
    # JOIN với item_categories để lấy tên danh mục.
    # Chỉ lấy các vật phẩm đang hoạt động (is_active = 1).
    cursor.execute('''
        SELECT si.*, ic.name as category_name
        FROM shared_items si
        LEFT JOIN item_categories ic ON si.category_id = ic.id
        WHERE si.group_id = %s AND si.is_active = 1
    ''', (group_id,))
    # Lấy tất cả các vật phẩm.
    items = cursor.fetchall()

    # Đóng con trỏ và kết nối DB.
    cursor.close()
    conn.close()
    # Trả về danh sách vật phẩm dưới dạng JSON.
    return jsonify(items)

@app.route('/api/items', methods=['POST'])
def create_item():
    # Tạo một vật phẩm chia sẻ mới trong nhóm của người dùng hiện tại.

    # Lấy user_id từ session.
    user_id = session.get('user_id')
    # Kiểm tra đăng nhập.
    if not user_id:
        return jsonify({'error': 'User not logged in'}), 401

    # Lấy dữ liệu JSON từ request.
    data = request.get_json()
    # Kết nối DB.
    conn = get_db_connection()
    # Tạo con trỏ với dictionary=True để lấy group_id và member_id.
    cursor = conn.cursor(dictionary=True)

    # Lấy id và group_id của thành viên hoạt động (Active) dựa trên user_id.
    cursor.execute("SELECT id, group_id FROM members WHERE user_id = %s AND status = %s LIMIT 1", (user_id, 'Active'))
    member = cursor.fetchone()
    # Nếu người dùng không phải là thành viên hoạt động của nhóm nào, trả về lỗi 403 Forbidden.
    if not member:
        cursor.close()
        conn.close()
        return jsonify({'error': 'User is not part of any active group'}), 403

    # Lấy group_id và member_id.
    group_id = member['group_id']
    member_id = member['id']

    # Sử dụng con trỏ mới hoặc reset con trỏ cũ nếu cần cho các truy vấn khác.
    # Ở đây tạo con trỏ mới không dùng dictionary=True cho các INSERT.
    cursor = conn.cursor()
    # Chèn vật phẩm mới vào bảng shared_items.
    cursor.execute(
        '''
        INSERT INTO shared_items
        (group_id, category_id, member_id, name, description, quantity, threshold, unit, image_url)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        ''',
        (
            group_id,
            data.get('category_id') or None, # Lấy category_id từ data, mặc định None nếu không có.
            member_id,
            data['name'],
            data.get('description'),
            data['quantity'],
            data['threshold'],
            data.get('unit'),
            data.get('image_url')
        )
    )
    # Lấy ID của vật phẩm vừa chèn.
    item_id = cursor.lastrowid

    # Ghi lại lịch sử tạo vật phẩm vào bảng item_histories.
    cursor.execute(
        '''
        INSERT INTO item_histories
        (item_id, member_id, action_type, quantity_change, new_quantity, notes)
        VALUES (%s, %s, %s, %s, %s, %s)
        ''',
        (item_id, member_id, 'create', data['quantity'], data['quantity'], 'Created new item')
    )

    # Lưu các thay đổi vào DB.
    conn.commit()
    # Đóng con trỏ và kết nối DB.
    cursor.close()
    conn.close()

    # Kiểm tra nếu số lượng hiện tại nhỏ hơn hoặc bằng ngưỡng, tạo thông báo.
    if data['quantity'] <= data['threshold']:
        create_low_stock_notification(item_id, data['name'], data['quantity'], data['threshold'])

    # Trả về ID vật phẩm vừa tạo và mã trạng thái 201 Created.
    return jsonify({'id': item_id, 'message': 'Item created'}), 201

@app.route('/api/items/<int:id>', methods=['PUT'])
def update_item(id):
    # Cập nhật thông tin của một vật phẩm chia sẻ.

    # Lấy user_id từ session.
    user_id = session.get('user_id')
    # Kiểm tra đăng nhập.
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401

    # Lấy dữ liệu JSON từ request.
    data = request.get_json()
    # Kết nối DB.
    conn = get_db_connection()
    # Tạo con trỏ.
    cursor = conn.cursor()

    # Lấy id thành viên hoạt động dựa trên user_id.
    cursor.execute('SELECT id FROM members WHERE user_id = %s AND status = %s LIMIT 1', (user_id, 'Active'))
    member = cursor.fetchone()
    # Kiểm tra xem người dùng có phải là thành viên hoạt động không.
    if not member:
        return jsonify({'error': 'User not in active group'}), 403

    # Lấy member_id.
    member_id = member[0]

    # Lấy số lượng hiện tại của vật phẩm trước khi cập nhật.
    cursor.execute('SELECT quantity FROM shared_items WHERE id = %s', (id,))
    old_quantity = cursor.fetchone()[0]

    # Cập nhật thông tin vật phẩm trong bảng shared_items.
    # Bao gồm cả cập nhật thời gian cập nhật (updated_at).
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
            datetime.now(), # Sử dụng datetime.now() để ghi lại thời gian cập nhật.
            id
        )
    )

    # Tính toán sự thay đổi số lượng.
    quantity_change = data['quantity'] - old_quantity
    # Ghi lại lịch sử cập nhật số lượng vào bảng item_histories.
    cursor.execute(
        '''
        INSERT INTO item_histories
        (item_id, member_id, action_type, quantity_change, old_quantity, new_quantity, notes)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        ''',
        (id, member_id, 'update', quantity_change, old_quantity, data['quantity'], 'Updated item details')
    )

    # Lưu các thay đổi vào DB.
    conn.commit()
    # Đóng con trỏ và kết nối DB.
    cursor.close()
    conn.close()

    # Kiểm tra nếu số lượng mới nhỏ hơn hoặc bằng ngưỡng, tạo thông báo.
    if data['quantity'] <= data['threshold']:
        create_low_stock_notification(id, data['name'], data['quantity'], data['threshold'])

    # Trả về thông báo thành công.
    return jsonify({'message': 'Item updated'})

@app.route('/api/items/<int:id>', methods=['DELETE'])
def delete_item(id):
    # Xóa mềm một vật phẩm chia sẻ (thiết lập is_active = 0).

    # Lấy user_id từ session.
    user_id = session.get('user_id')
    # Kiểm tra đăng nhập.
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401

    # Kết nối DB.
    conn = get_db_connection()
    # Tạo con trỏ.
    cursor = conn.cursor()

    # Lấy id thành viên hoạt động dựa trên user_id.
    cursor.execute('SELECT id FROM members WHERE user_id = %s AND status = %s LIMIT 1', (user_id, 'Active'))
    member = cursor.fetchone()
    # Kiểm tra xem người dùng có phải là thành viên hoạt động không.
    if not member:
        return jsonify({'error': 'User not in active group'}), 403

    # Lấy member_id.
    member_id = member[0]

    # Cập nhật trạng thái is_active của vật phẩm thành 0 (xóa mềm).
    cursor.execute('UPDATE shared_items SET is_active = 0 WHERE id = %s', (id,))

    # Ghi lại lịch sử xóa (deactivate) vật phẩm.
    cursor.execute(
        '''
        INSERT INTO item_histories
        (item_id, member_id, action_type, notes)
        VALUES (%s, %s, %s, %s)
        ''',
        (id, member_id, 'delete', 'Item deactivated') # Action type là 'delete' nhưng thực tế là deactivate.
    )

    # Lưu các thay đổi vào DB.
    conn.commit()
    # Đóng con trỏ và kết nối DB.
    cursor.close()
    conn.close()
    # Trả về thông báo thành công.
    return jsonify({'message': 'Item deleted'}) # Thông báo là deleted nhưng là deactivated.

@app.route('/api/items/<int:id>/quantity', methods=['PATCH'])
def update_item_quantity(id):
    # Cập nhật số lượng của một vật phẩm chia sẻ.

    # Lấy dữ liệu JSON từ request (chứa 'change').
    data = request.get_json()
    # Lấy giá trị thay đổi số lượng.
    change = data['change']

    # Kết nối DB.
    conn = get_db_connection()
    # Tạo con trỏ.
    cursor = conn.cursor()

    # Lấy số lượng hiện tại, ngưỡng và tên của vật phẩm.
    cursor.execute('SELECT quantity, threshold, name FROM shared_items WHERE id = %s', (id,))
    item = cursor.fetchone()
    # Kiểm tra xem vật phẩm có tồn tại không.
    if not item:
        cursor.close()
        conn.close()
        return jsonify({'error': 'Item not found'}), 404 # Thêm xử lý nếu không tìm thấy vật phẩm.

    # Lấy các giá trị từ kết quả truy vấn.
    old_quantity = item[0]
    threshold = item[1]
    name = item[2]

    # Tính toán số lượng mới, đảm bảo không nhỏ hơn 0.
    new_quantity = max(0, old_quantity + change)
    # Cập nhật số lượng mới trong bảng shared_items.
    cursor.execute(
        'UPDATE shared_items SET quantity = %s WHERE id = %s',
        (new_quantity, id)
    )

    # Ghi lại lịch sử cập nhật số lượng vào bảng item_histories.
    # Lưu ý: member_id đang được fix cứng là 1, cần thay thế bằng user_id của người thực hiện.
    user_id = session.get('user_id') # Lấy user_id từ session
    member_id = 1 # Cần lấy member_id từ user_id như các hàm khác

    # Truy vấn để lấy member_id dựa trên user_id (cần thêm vào đây)
    member_cursor = conn.cursor() # Tạo con trỏ riêng để tránh ảnh hưởng đến cursor chính
    member_cursor.execute('SELECT id FROM members WHERE user_id = %s AND status = %s LIMIT 1', (user_id, 'Active'))
    member_info = member_cursor.fetchone()
    member_cursor.close() # Đóng con trỏ phụ
    
    if member_info:
        member_id = member_info[0]
    else:
         # Xử lý trường hợp người dùng không thuộc nhóm hoạt động (tương tự các hàm trên)
         conn.rollback() # Hoàn tác các thay đổi đã thực hiện trước đó
         cursor.close()
         conn.close()
         return jsonify({'error': 'User not in active group'}), 403


    cursor.execute(
        '''
        INSERT INTO item_histories
        (item_id, member_id, action_type, quantity_change, old_quantity, new_quantity)
        VALUES (%s, %s, %s, %s, %s, %s)
        ''',
        (id, member_id, 'update', change, old_quantity, new_quantity) # Sử dụng member_id đã lấy được
    )

    # Lưu các thay đổi vào DB.
    conn.commit()
    # Đóng con trỏ và kết nối DB.
    cursor.close()
    conn.close()

    # Kiểm tra nếu số lượng mới nhỏ hơn hoặc bằng ngưỡng, tạo thông báo.
    if new_quantity <= threshold:
        create_low_stock_notification(id, name, new_quantity, threshold) # Cần định nghĩa hàm này

    # Trả về thông báo thành công và số lượng mới.
    return jsonify({'message': 'Quantity updated', 'new_quantity': new_quantity})

# Shopping List Routes (Các Tuyến API Danh Sách Mua Sắm)
# Định nghĩa các tuyến API cho việc quản lý danh sách các vật phẩm cần mua sắm.

@app.route('/api/shopping-list', methods=['GET'])
def get_shopping_list():
    # Lấy danh sách các vật phẩm cần mua sắm (chưa hoàn thành) cho một nhóm cụ thể.
    # Lưu ý: group_id đang được fix cứng là 1, cần thay thế bằng group_id của người dùng.

    # Kết nối DB.
    conn = get_db_connection()
    # Tạo con trỏ với dictionary=True.
    cursor = conn.cursor(dictionary=True)

    # Lấy group_id của người dùng hiện tại. (Cần thêm logic lấy group_id tương tự hàm get_items)
    user_id = session.get('user_id')
    if not user_id:
        cursor.close()
        conn.close()
        return jsonify([]), 401

    member_cursor = conn.cursor()
    member_cursor.execute("SELECT group_id FROM members WHERE user_id = %s LIMIT 1", (user_id,))
    member_info = member_cursor.fetchone()
    member_cursor.close()

    if not member_info:
        cursor.close()
        conn.close()
        return jsonify([]), 404 # Trả về 404 nếu người dùng không thuộc nhóm

    group_id = member_info[0] # Lấy group_id

    # Truy vấn các vật phẩm từ bảng shopping_lists thuộc group_id này và chưa hoàn thành (is_completed = 0).
    # JOIN với shared_items để lấy tên vật phẩm nếu có item_id liên kết.
    cursor.execute('''
        SELECT sl.*, si.name as item_name
        FROM shopping_lists sl
        LEFT JOIN shared_items si ON sl.item_id = si.id
        WHERE sl.group_id = %s AND sl.is_completed = 0
    ''', (group_id,)) # Sử dụng group_id đã lấy được
    # Lấy tất cả các vật phẩm trong danh sách mua sắm.
    items = cursor.fetchall()
    # Đóng con trỏ và kết nối DB.
    cursor.close()
    conn.close()
    # Trả về danh sách dưới dạng JSON.
    return jsonify(items)

@app.route('/api/shopping-list', methods=['POST'])
def add_to_shopping_list():
    # Thêm một vật phẩm vào danh sách mua sắm của nhóm.
    # Lưu ý: group_id và member_id đang được fix cứng là 1, cần thay thế.

    # Lấy dữ liệu JSON từ request.
    data = request.get_json()
    # Kết nối DB.
    conn = get_db_connection()
    # Tạo con trỏ.
    cursor = conn.cursor()

    # Lấy group_id và member_id của người dùng hiện tại. (Cần thêm logic tương tự create_item)
    user_id = session.get('user_id')
    if not user_id:
        cursor.close()
        conn.close()
        return jsonify({'error': 'User not logged in'}), 401

    member_cursor = conn.cursor()
    member_cursor.execute("SELECT id, group_id FROM members WHERE user_id = %s AND status = %s LIMIT 1", (user_id, 'Active'))
    member_info = member_cursor.fetchone()
    member_cursor.close()

    if not member_info:
        cursor.close()
        conn.close()
        return jsonify({'error': 'User is not part of any active group'}), 403

    member_id = member_info[0]
    group_id = member_info[1]

    # Chèn vật phẩm mới vào bảng shopping_lists.
    cursor.execute(
        '''
        INSERT INTO shopping_lists
        (group_id, member_id, item_id, item_name, quantity, unit, notes)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        ''',
        (
            group_id, # Sử dụng group_id đã lấy được
            member_id, # Sử dụng member_id đã lấy được
            data.get('item_id') or None, # Có thể liên kết với shared_item hoặc không.
            data['item_name'],
            data['quantity'],
            data.get('unit'),
            data.get('notes')
        )
    )
    # Lưu các thay đổi vào DB.
    conn.commit()
    # Lấy ID của hàng vừa chèn.
    item_id = cursor.lastrowid
    # Đóng con trỏ và kết nối DB.
    cursor.close()
    conn.close()
    # Trả về ID vật phẩm và thông báo thành công với mã trạng thái 201 Created.
    return jsonify({'id': item_id, 'message': 'Added to shopping list'}), 201

@app.route('/api/shopping-list/<int:id>', methods=['DELETE'])
def remove_from_shopping_list(id):
    # Xóa một vật phẩm khỏi danh sách mua sắm.

    # Kết nối DB.
    conn = get_db_connection()
    # Tạo con trỏ.
    cursor = conn.cursor()
    # Xóa hàng có ID tương ứng trong bảng shopping_lists.
    cursor.execute('DELETE FROM shopping_lists WHERE id = %s', (id,))
    # Lưu các thay đổi vào DB.
    conn.commit()
    # Đóng con trỏ và kết nối DB.
    cursor.close()
    conn.close()
    # Trả về thông báo thành công.
    return jsonify({'message': 'Item removed from shopping list'})

@app.route('/api/shopping-list/<int:id>/complete', methods=['PATCH'])
def complete_shopping_item(id):
    # Đánh dấu một vật phẩm trong danh sách mua sắm là đã hoàn thành.
    # Lưu ý: completed_by đang được fix cứng là 1, cần thay thế.

    # Kết nối DB.
    conn = get_db_connection()
    # Tạo con trỏ.
    cursor = conn.cursor()

    # Lấy member_id của người dùng hiện tại. (Cần thêm logic tương tự add_to_shopping_list)
    user_id = session.get('user_id')
    if not user_id:
         cursor.close()
         conn.close()
         return jsonify({'error': 'User not logged in'}), 401

    member_cursor = conn.cursor()
    member_cursor.execute("SELECT id FROM members WHERE user_id = %s AND status = %s LIMIT 1", (user_id, 'Active'))
    member_info = member_cursor.fetchone()
    member_cursor.close()

    if not member_info:
        cursor.close()
        conn.close()
        return jsonify({'error': 'User not in active group'}), 403

    member_id = member_info[0]

    # Cập nhật trạng thái is_completed thành 1, ghi lại người hoàn thành và thời gian hoàn thành.
    cursor.execute(
        '''
        UPDATE shopping_lists
        SET is_completed = 1, completed_by = %s, completed_at = %s
        WHERE id = %s
        ''',
        (member_id, datetime.now(), id) # Sử dụng member_id đã lấy được
    )
    # Lưu các thay đổi vào DB.
    conn.commit()
    # Đóng con trỏ và kết nối DB.
    cursor.close()
    conn.close()
    # Trả về thông báo thành công.
    return jsonify({'message': 'Shopping item marked as completed'})

@app.route('/api/shopping-list/clear', methods=['DELETE'])
def clear_shopping_list():
    # Xóa tất cả các vật phẩm đã hoàn thành khỏi danh sách mua sắm của nhóm.
    # Lưu ý: group_id đang được fix cứng là 1, cần thay thế.

    # Kết nối DB.
    conn = get_db_connection()
    # Tạo con trỏ.
    cursor = conn.cursor()

    # Lấy group_id của người dùng hiện tại. (Cần thêm logic tương tự get_shopping_list)
    user_id = session.get('user_id')
    if not user_id:
        cursor.close()
        conn.close()
        return jsonify({'error': 'User not logged in'}), 401

    member_cursor = conn.cursor()
    member_cursor.execute("SELECT group_id FROM members WHERE user_id = %s LIMIT 1", (user_id,))
    member_info = member_cursor.fetchone()
    member_cursor.close()

    if not member_info:
        cursor.close()
        conn.close()
        return jsonify({'error': 'User not in active group'}), 404

    group_id = member_info[0]

    # Xóa các hàng trong shopping_lists thuộc group_id này và đã hoàn thành (is_completed = 1).
    cursor.execute('DELETE FROM shopping_lists WHERE group_id = %s AND is_completed = 1', (group_id,)) # Sử dụng group_id đã lấy được
    # Lưu các thay đổi vào DB.
    conn.commit()
    # Đóng con trỏ và kết nối DB.
    cursor.close()
    conn.close()
    # Trả về thông báo thành công.
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
# ============================= #
#       ROUTING & Công Việc      #
# ============================= #

# --- Task Routes ---
# Định nghĩa các tuyến API cho việc quản lý công việc (tasks) trong nhóm.

# --- Get tasks ---
# Tuyến API để lấy danh sách các công việc.
@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    # Lấy danh sách công việc dựa trên các tiêu chí lọc (status, assignee, date range).
    try:
        # 1) Kiểm tra trạng thái đăng nhập của người dùng.
        user_id = session.get('user_id')
        if not user_id:
            # Trả về lỗi 401 Unauthorized nếu người dùng chưa đăng nhập.
            return jsonify({"error": "Vui lòng đăng nhập"}), 401

        # Kết nối đến cơ sở dữ liệu.
        conn = get_db_connection()
        # Tạo con trỏ DB, trả về kết quả dưới dạng dictionary để dễ truy cập theo tên cột.
        cursor = conn.cursor(dictionary=True)

        # 2) Lấy group_id của nhóm mà người dùng hiện tại là thành viên 'Active'.
        cursor.execute("""
            SELECT group_id
            FROM members
            WHERE user_id = %s
              AND status = 'Active'
            LIMIT 1
        """, (user_id,))
        # Lấy thông tin thành viên (nếu có).
        member = cursor.fetchone()
        # Kiểm tra nếu người dùng không phải là thành viên hoạt động của nhóm nào.
        if not member:
            # Đóng kết nối và trả về lỗi 403 Forbidden.
            cursor.close()
            conn.close()
            return jsonify({"error": "Bạn chưa tham gia nhóm nào"}), 403

        # Lấy group_id từ kết quả truy vấn.
        group_id = member['group_id']

        # 3) Xây dựng câu truy vấn SQL động dựa trên các tham số lọc từ request.
        status   = request.args.get('status')     # Lấy tham số status: 'completed', 'pending', 'overdue' hoặc None.
        assignee = request.args.get('assignee')    # Lấy tham số assignee (initial của member) hoặc None.
        from_date = request.args.get('from_date')  # Lấy ngày bắt đầu khoảng thời gian lọc.
        to_date   = request.args.get('to_date')    # Lấy ngày kết thúc khoảng thời gian lọc.

        # Validate (kiểm tra tính hợp lệ) tham số status.
        if status and status not in ('completed', 'pending', 'overdue'):
            # Nếu status không hợp lệ, đóng kết nối và trả về lỗi 400 Bad Request.
            cursor.close()
            conn.close()
            return jsonify({"error": "Trạng thái không hợp lệ"}), 400

        # Câu truy vấn SQL cơ bản để lấy tasks thuộc group_id, join với members và users để lấy tên người phụ trách.
        sql = """
    SELECT
        t.*,
        u.full_name AS assignee_name
    FROM tasks t
    LEFT JOIN members m ON t.assignee_id = m.id
    LEFT JOIN users u ON m.user_id = u.id
    WHERE t.group_id = %s
        """
        # Danh sách các tham số sẽ được truyền vào câu truy vấn SQL.
        params = [group_id]

        # Lấy ngày hiện tại để so sánh với due_date cho các trạng thái 'pending' và 'overdue'.
        today = date.today().isoformat()
        # Thêm điều kiện lọc theo status vào câu truy vấn.
        if status == 'completed':
            sql += " AND t.completed = 1"
        elif status == 'pending':
            sql += " AND t.completed = 0 AND t.due_date >= %s"
            params.append(today) # Thêm ngày hiện tại vào danh sách tham số.
        elif status == 'overdue':
            sql += " AND t.completed = 0 AND t.due_date < %s"
            params.append(today) # Thêm ngày hiện tại vào danh sách tham số.

        # Thêm điều kiện lọc theo assignee nếu có.
        # Lấy assignee_id từ initial của member trong nhóm.
        if assignee and assignee.lower() != 'all': # Bỏ qua lọc nếu assignee là 'all'.
            sql += """
             AND t.assignee_id = (
                   SELECT id FROM members
                   WHERE initial = %s
                     AND group_id = %s
                   LIMIT 1
               )
            """
            params.extend([assignee, group_id]) # Thêm initial và group_id vào danh sách tham số.

        # Thêm điều kiện lọc theo khoảng ngày due_date nếu có.
        if from_date:
            sql += " AND t.due_date >= %s"
            params.append(from_date)
        if to_date:
            sql += " AND t.due_date <= %s"
            params.append(to_date)

        # Sắp xếp kết quả theo due_date tăng dần.
        sql += " ORDER BY t.due_date ASC"

        # 4) Thực thi câu truy vấn với các tham số đã chuẩn bị.
        cursor.execute(sql, params)
        # Lấy tất cả kết quả.
        tasks = cursor.fetchall()

        # Đóng con trỏ và kết nối DB.
        cursor.close()
        conn.close()
        # Trả về danh sách công việc và mã trạng thái 200 OK.
        return jsonify(tasks), 200

    # Xử lý lỗi liên quan đến cơ sở dữ liệu.
    except mysql.connector.Error as e:
        # Trả về lỗi 500 Internal Server Error với thông báo lỗi DB.
        return jsonify({"error": f"Lỗi cơ sở dữ liệu: {str(e)}"}), 500
    # Xử lý các lỗi ngoại lệ khác.
    except Exception as e:
        # Trả về lỗi 500 Internal Server Error với thông báo lỗi hệ thống chung.
        return jsonify({"error": f"Lỗi hệ thống: {str(e)}"}), 500

# --- Create task ---
# Hàm hỗ trợ để lấy group_id mà user đang tham gia với status 'Active'.
def get_user_group_id(user_id):
    # Kết nối đến cơ sở dữ liệu.
    conn = get_db_connection()
    # Tạo con trỏ DB, trả về kết quả dưới dạng dictionary.
    cursor = conn.cursor(dictionary=True)
    # Truy vấn group_id của thành viên hoạt động (Active) dựa trên user_id.
    cursor.execute("""
        SELECT group_id
        FROM members
        WHERE user_id = %s
          AND status = 'Active'
        LIMIT 1
    """, (user_id,))
    # Lấy kết quả (một hàng hoặc None).
    row = cursor.fetchone()
    # Đóng con trỏ và kết nối DB.
    cursor.close()
    conn.close()
    # Trả về group_id nếu tìm thấy, ngược lại trả về None.
    return row['group_id'] if row else None

# --- Create Task ---
# Tuyến API để tạo một công việc mới.
@app.route('/api/tasks', methods=['POST'])
def create_task():
    # Lấy user_id từ session.
    user_id = session.get('user_id')
    # Kiểm tra đăng nhập.
    if not user_id:
        return jsonify({"error": "Vui lòng đăng nhập"}), 401

    # Lấy dữ liệu JSON từ request.
    data = request.get_json()
    # Định nghĩa các trường bắt buộc trong dữ liệu request.
    required_fields = ['type', 'assignee', 'date', 'priority']
    # Kiểm tra xem dữ liệu có tồn tại và có chứa đủ các trường bắt buộc không.
    if not data or not all(key in data for key in required_fields):
        # Trả về lỗi 400 Bad Request nếu thiếu thông tin.
        return jsonify({"error": "Thiếu thông tin bắt buộc"}), 400

    # Lấy group_id của người dùng hiện tại bằng hàm hỗ trợ.
    group_id = get_user_group_id(user_id)
    # Kiểm tra nếu người dùng không thuộc nhóm hoạt động nào.
    if not group_id:
        return jsonify({"error": "Bạn chưa tham gia nhóm nào"}), 403

    # Validate (kiểm tra tính hợp lệ) của mức độ ưu tiên (priority).
    valid_priorities = ['low', 'medium', 'high']
    if data['priority'] not in valid_priorities:
        return jsonify({"error": "Mức độ ưu tiên không hợp lệ"}), 400

    # Validate (kiểm tra tính hợp lệ) của assignee_id (phải là số nguyên).
    try:
        assignee_id = int(data['assignee'])
    except (ValueError, TypeError):
        # Trả về lỗi 400 nếu assignee không phải là số nguyên hợp lệ.
        return jsonify({"error": "Người phụ trách không hợp lệ"}), 400

    # Kết nối DB.
    conn = get_db_connection()
    # Tạo con trỏ.
    cursor = conn.cursor()
    # Kiểm tra xem assignee_id có tồn tại trong bảng members và thuộc nhóm của người dùng hiện tại không.
    cursor.execute(
        "SELECT id FROM members WHERE id = %s AND group_id = %s LIMIT 1",
        (assignee_id, group_id)
    )
    # Nếu không tìm thấy assignee hợp lệ trong nhóm.
    if not cursor.fetchone():
        # Đóng kết nối và trả về lỗi 400 Bad Request.
        cursor.close()
        conn.close()
        return jsonify({"error": "Người phụ trách không tồn tại hoặc không thuộc nhóm"}), 400

    # Chèn công việc mới vào bảng tasks.
    cursor.execute(
        '''
        INSERT INTO tasks
            (group_id, custom_type, description, assignee_id, due_date, priority, completed)
        VALUES
            (%s, %s, %s, %s, %s, %s, 0) -- Mặc định công việc chưa hoàn thành (completed = 0)
        ''',
        (
            group_id,
            data['type'],
            data.get('desc'), # Lấy description, mặc định None nếu không có.
            assignee_id,
            data['date'],     # due_date
            data['priority']
        )
    )
    # Lưu các thay đổi vào DB.
    conn.commit()
    # Lấy ID của hàng vừa chèn.
    new_id = cursor.lastrowid
    # Đóng con trỏ và kết nối DB.
    cursor.close()
    conn.close()

    # Trả về ID công việc vừa tạo và thông báo thành công với mã trạng thái 201 Created.
    return jsonify({"id": new_id, "message": "Tạo công việc thành công"}), 201

# --- Update Task ---
# Tuyến API để cập nhật thông tin một công việc.
@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    # Lấy user_id từ session.
    user_id = session.get('user_id')
    # Kiểm tra đăng nhập.
    if not user_id:
        return jsonify({"error": "Vui lòng đăng nhập"}), 401

    # Lấy dữ liệu JSON từ request.
    data = request.get_json()
    # Định nghĩa các trường bắt buộc cần có để cập nhật.
    required_fields = ['type', 'desc', 'assignee', 'date', 'priority']
    # Kiểm tra dữ liệu và các trường bắt buộc.
    if not data or not all(field in data for field in required_fields):
        return jsonify({"error": "Thiếu thông tin bắt buộc"}), 400

    # Lấy group_id của người dùng.
    group_id = get_user_group_id(user_id)
    # Kiểm tra thành viên nhóm.
    if not group_id:
        return jsonify({"error": "Bạn chưa tham gia nhóm nào"}), 403

    # Validate (kiểm tra tính hợp lệ) priority và assignee_id.
    valid_priorities = ['low', 'medium', 'high']
    if data['priority'] not in valid_priorities:
        return jsonify({"error": "Mức độ ưu tiên không hợp lệ"}), 400
    try:
        assignee_id = int(data['assignee'])
    except (ValueError, TypeError):
        return jsonify({"error": "Người phụ trách không hợp lệ"}), 400

    # Kết nối DB.
    conn = get_db_connection()
    # Tạo con trỏ với dictionary=True để kiểm tra sự tồn tại.
    cursor = conn.cursor(dictionary=True)
    # Kiểm tra xem công việc có tồn tại với task_id và thuộc group_id này không.
    cursor.execute(
        "SELECT id FROM tasks WHERE id = %s AND group_id = %s",
        (task_id, group_id)
    )
    # Nếu không tìm thấy công việc.
    if not cursor.fetchone():
        # Đóng kết nối và trả về lỗi 404 Not Found.
        cursor.close()
        conn.close()
        return jsonify({"error": "Công việc không tồn tại"}), 404

    # Kiểm tra xem assignee_id có tồn tại trong bảng members và thuộc nhóm của người dùng hiện tại không.
    cursor.execute(
        "SELECT id FROM members WHERE id = %s AND group_id = %s LIMIT 1",
        (assignee_id, group_id)
    )
    # Nếu không tìm thấy assignee hợp lệ trong nhóm.
    if not cursor.fetchone():
        # Đóng kết nối và trả về lỗi 400 Bad Request.
        cursor.close()
        conn.close()
        return jsonify({"error": "Người phụ trách không tồn tại hoặc không thuộc nhóm"}), 400

    # Đóng con trỏ dictionary=True và tạo con trỏ mới cho lệnh UPDATE nếu cần
    cursor.close()
    cursor = conn.cursor()

    # Cập nhật thông tin công việc trong bảng tasks.
    cursor.execute(
        """
        UPDATE tasks
        SET
            custom_type = %s,
            description = %s,
            assignee_id = %s,
            due_date    = %s,
            priority    = %s,
            completed   = %s -- Cập nhật trạng thái hoàn thành
        WHERE id = %s AND group_id = %s
        """,
        (
            data['type'],
            data.get('desc'),
            assignee_id,
            data['date'],
            data['priority'],
            1 if data.get('completed') else 0, # Chuyển giá trị boolean/khác sang 1 hoặc 0.
            task_id,
            group_id
        )
    )
    # Lưu các thay đổi vào DB.
    conn.commit()
    # Đóng con trỏ và kết nối DB.
    cursor.close()
    conn.close()

    # Trả về thông báo cập nhật thành công với mã trạng thái 200 OK.
    return jsonify({"message": "Cập nhật công việc thành công"}), 200

# --- Delete Task ---
# Tuyến API để xóa một công việc.
@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    # Lấy user_id từ session.
    user_id = session.get('user_id')
    # Kiểm tra đăng nhập.
    if not user_id:
        return jsonify({"error": "Vui lòng đăng nhập"}), 401

    # Lấy group_id của người dùng.
    group_id = get_user_group_id(user_id)
    # Kiểm tra thành viên nhóm.
    if not group_id:
        return jsonify({"error": "Bạn chưa tham gia nhóm nào"}), 403

    # Kết nối DB.
    conn = get_db_connection()
    # Tạo con trỏ.
    cursor = conn.cursor()
    # Kiểm tra xem công việc có tồn tại với task_id và thuộc group_id này không trước khi xóa.
    cursor.execute(
        "SELECT id FROM tasks WHERE id = %s AND group_id = %s",
        (task_id, group_id)
    )
    # Nếu không tìm thấy công việc.
    if cursor.fetchone() is None: # Cách kiểm tra rõ ràng hơn.
        # Đóng kết nối và trả về lỗi 404 Not Found.
        cursor.close()
        conn.close()
        return jsonify({"error": "Công việc không tồn tại"}), 404

    # Xóa công việc khỏi bảng tasks.
    cursor.execute(
        "DELETE FROM tasks WHERE id = %s AND group_id = %s",
        (task_id, group_id)
    )
    # Lưu các thay đổi vào DB.
    conn.commit()
    # Đóng con trỏ và kết nối DB.
    cursor.close()
    conn.close()
    # Trả về thông báo xóa thành công với mã trạng thái 200 OK.
    return jsonify({"message": "Xóa công việc thành công"}), 200

# --- Mark Complete ---
# Tuyến API để đánh dấu một công việc là đã hoàn thành.
@app.route('/api/tasks/<int:task_id>/complete', methods=['PATCH'])
def mark_complete(task_id):
    # Lấy user_id từ session.
    user_id = session.get('user_id')
    # Kiểm tra đăng nhập.
    if not user_id:
        return jsonify({"error": "Vui lòng đăng nhập"}), 401

    # Lấy group_id của người dùng.
    group_id = get_user_group_id(user_id)
    # Kiểm tra thành viên nhóm.
    if not group_id:
        return jsonify({"error": "Bạn chưa tham gia nhóm nào"}), 403

    # Kết nối DB.
    conn = get_db_connection()
    # Tạo con trỏ.
    cursor = conn.cursor()
    # Cập nhật trường 'completed' của công việc thành 1 (đã hoàn thành).
    # Kiểm tra cả task_id và group_id để đảm bảo cập nhật đúng công việc trong đúng nhóm.
    cursor.execute(
        "UPDATE tasks SET completed = 1 WHERE id = %s AND group_id = %s",
        (task_id, group_id)
    )
    # Kiểm tra số lượng hàng bị ảnh hưởng bởi lệnh UPDATE. Nếu là 0, tức là không tìm thấy công việc hoặc không có gì để cập nhật.
    if cursor.rowcount == 0:
        # Đóng kết nối và trả về lỗi 404 Not Found.
        cursor.close()
        conn.close()
        return jsonify({"error": "Công việc không tồn tại hoặc không thể cập nhật"}), 404

    # Lưu các thay đổi vào DB.
    conn.commit()
    # Đóng con trỏ và kết nối DB.
    cursor.close()
    conn.close()
    # Trả về xác nhận đã hoàn thành với mã trạng thái 200 OK.
    return jsonify({"completed": True}), 200



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

# ============================= #
#       ROUTING & Chi Phí      #
# ============================= #




# Helper function to execute queries (Hàm hỗ trợ thực thi truy vấn DB)
# Hàm này được sử dụng để tập trung logic kết nối, thực thi, commit và đóng kết nối DB.
def execute_query(query, params=None, fetch=True):
    # Kết nối đến cơ sở dữ liệu.
    conn = get_db_connection()
    # Tạo con trỏ DB, trả về kết quả dưới dạng dictionary.
    cursor = conn.cursor(dictionary=True)
    try:
        # Thực thi câu truy vấn.
        if params:
            # Nếu có tham số, truyền tham số vào query.
            cursor.execute(query, params)
        else:
            # Nếu không có tham số, chỉ thực thi query.
            cursor.execute(query)

        # Xử lý kết quả dựa trên tham số fetch.
        if fetch:
            # Nếu fetch=True, lấy tất cả kết quả và commit các thay đổi.
            result = cursor.fetchall()
            conn.commit() # Commit các lệnh thay đổi dữ liệu (INSERT, UPDATE, DELETE).
            return result
        # Nếu fetch=False, chỉ commit các thay đổi và trả về ID của hàng được chèn gần nhất.
        conn.commit()
        return cursor.lastrowid
    except mysql.connector.Error as err:
        # Bắt lỗi khi thực thi truy vấn DB, in lỗi ra console (có thể log ra file).
        print(f"Error: {err}")
        # Trả về None nếu có lỗi.
        return None
    finally:
        # Đảm bảo con trỏ và kết nối DB luôn được đóng sau khi hoàn thành hoặc gặp lỗi.
        cursor.close()
        conn.close()

# Routes for Funds (Các Tuyến API cho Quỹ)
# Định nghĩa các tuyến API liên quan đến quản lý quỹ của nhóm.

@app.route('/api/funds/<int:group_id>', methods=['GET'])
def get_funds(group_id):
    # Lấy danh sách các quỹ thuộc một nhóm cụ thể.
    query = "SELECT * FROM funds WHERE group_id = %s"
    # Sử dụng hàm helper execute_query để lấy dữ liệu.
    funds = execute_query(query, (group_id,))
    # Trả về danh sách quỹ dưới dạng JSON, trả về danh sách rỗng nếu không có quỹ nào.
    return jsonify(funds if funds else [])

@app.route('/api/funds', methods=['POST'])
def add_fund():
    # Thêm một quỹ mới vào nhóm.
    data = request.json # Lấy dữ liệu JSON từ request.
    query = """
        INSERT INTO funds (group_id, name, amount, description, category)
        VALUES (%s, %s, %s, %s, %s)
    """
    # Chuẩn bị tham số cho câu truy vấn từ dữ liệu request.
    params = (data['group_id'], data['name'], data['amount'], data['description'], data['category'])
    # Sử dụng hàm helper execute_query để chèn dữ liệu, không cần lấy kết quả (fetch=False).
    fund_id = execute_query(query, params, fetch=False)
    # Trả về ID của quỹ vừa tạo và thông báo thành công.
    return jsonify({"id": fund_id, "message": "Fund added successfully"})

@app.route('/api/funds/<int:fund_id>', methods=['PUT'])
def update_fund(fund_id):
    # Cập nhật thông tin của một quỹ cụ thể.
    data = request.json # Lấy dữ liệu JSON từ request.
    query = """
        UPDATE funds SET name = %s, amount = %s, description = %s, category = %s
        WHERE id = %s
    """
    # Chuẩn bị tham số cho câu truy vấn UPDATE.
    params = (data['name'], data['amount'], data['description'], data['category'], fund_id)
    # Sử dụng hàm helper execute_query để cập nhật dữ liệu, không cần lấy kết quả.
    execute_query(query, params, fetch=False)
    # Trả về thông báo cập nhật thành công.
    return jsonify({"message": "Fund updated successfully"})

@app.route('/api/funds/<int:fund_id>', methods=['DELETE'])
def delete_fund(fund_id):
    # Xóa một quỹ cụ thể.
    query = "DELETE FROM funds WHERE id = %s"
    # Sử dụng hàm helper execute_query để xóa dữ liệu, không cần lấy kết quả.
    execute_query(query, (fund_id,), fetch=False)
    # Trả về thông báo xóa thành công.
    return jsonify({"message": "Fund deleted successfully"})

# Routes for Member Contributions (Các Tuyến API cho Đóng Góp của Thành Viên)
# Định nghĩa các tuyến API liên quan đến việc quản lý các khoản đóng góp của thành viên vào quỹ.

@app.route('/api/contributions/<int:fund_id>', methods=['GET'])
def get_contributions(fund_id):
    # Lấy danh sách các khoản đóng góp cho một quỹ cụ thể.
    query = """
        SELECT mc.*, m.user_id, u.full_name as name, u.email
        FROM member_contributions mc
        JOIN members m ON mc.member_id = m.id
        JOIN users u ON m.user_id = u.id
        WHERE mc.fund_id = %s
    """
    # Sử dụng hàm helper execute_query để lấy dữ liệu, join với members và users để lấy thông tin thành viên.
    contributions = execute_query(query, (fund_id,))
    # Trả về danh sách đóng góp dưới dạng JSON, trả về danh sách rỗng nếu không có khoản nào.
    return jsonify(contributions if contributions else [])

@app.route('/api/contributions', methods=['POST'])
def add_contribution():
    # Thêm một khoản đóng góp mới của thành viên.
    data = request.json # Lấy dữ liệu JSON từ request.
    query = """
        INSERT INTO member_contributions (member_id, fund_id, amount, period, email, phone)
        VALUES (%s, %s, %s, %s, %s, %s)
    """
    # Chuẩn bị tham số cho câu truy vấn từ dữ liệu request. Sử dụng data.get() để lấy các trường tùy chọn (email, phone).
    params = (data['member_id'], data['fund_id'], data['amount'], data['period'], data.get('email'), data.get('phone'))
    # Sử dụng hàm helper execute_query để chèn dữ liệu, không cần lấy kết quả.
    contribution_id = execute_query(query, params, fetch=False)
    # Trả về ID của khoản đóng góp vừa thêm và thông báo thành công.
    return jsonify({"id": contribution_id, "message": "Contribution added successfully"})

@app.route('/api/contributions/<int:contribution_id>', methods=['PUT'])
def update_contribution(contribution_id):
    # Cập nhật thông tin của một khoản đóng góp cụ thể.
    data = request.json # Lấy dữ liệu JSON từ request.
    query = """
        UPDATE member_contributions
        SET amount = %s, period = %s, paid = %s, last_paid = %s, email = %s, phone = %s
        WHERE id = %s
    """
    # Chuẩn bị tham số cho câu truy vấn UPDATE.
    params = (data['amount'], data['period'], data['paid'], data.get('last_paid'), data.get('email'), data.get('phone'), contribution_id)
    # Sử dụng hàm helper execute_query để cập nhật dữ liệu, không cần lấy kết quả.
    execute_query(query, params, fetch=False)
    # Trả về thông báo cập nhật thành công.
    return jsonify({"message": "Contribution updated successfully"})

@app.route('/api/contributions/<int:contribution_id>/confirm', methods=['PUT'])
def confirm_contribution(contribution_id):
    # Đánh dấu một khoản đóng góp là đã được thanh toán (paid = 1).
    data = request.json # Lấy dữ liệu JSON từ request (chứa last_paid).
    query = """
        UPDATE member_contributions
        SET paid = 1, last_paid = %s
        WHERE id = %s
    """
    # Chuẩn bị tham số cho câu truy vấn UPDATE.
    params = (data['last_paid'], contribution_id)
    # Sử dụng hàm helper execute_query để cập nhật dữ liệu, không cần lấy kết quả.
    execute_query(query, params, fetch=False)
    # Trả về thông báo xác nhận thành công.
    return jsonify({"message": "Contribution confirmed successfully"})

@app.route('/api/contributions/<int:contribution_id>', methods=['DELETE'])
def delete_contribution(contribution_id):
    # Xóa một khoản đóng góp cụ thể.
    query = "DELETE FROM member_contributions WHERE id = %s"
    # Sử dụng hàm helper execute_query để xóa dữ liệu, không cần lấy kết quả.
    execute_query(query, (contribution_id,), fetch=False)
    # Trả về thông báo xóa thành công.
    return jsonify({"message": "Contribution deleted successfully"})

# Routes for Transactions (Các Tuyến API cho Giao Dịch)
# Định nghĩa các tuyến API liên quan đến việc quản lý các giao dịch (thu/chi) của quỹ.

@app.route('/api/transactions/<int:fund_id>', methods=['GET'])
def get_transactions(fund_id):
    # Lấy danh sách các giao dịch cho một quỹ cụ thể.
    query = """
        SELECT t.*, u.full_name as member_name
        FROM transactions t
        LEFT JOIN members m ON t.member_id = m.id
        LEFT JOIN users u ON m.user_id = u.id
        WHERE t.fund_id = %s
        ORDER BY t.date DESC -- Sắp xếp theo ngày giảm dần.
    """
    # Sử dụng hàm helper execute_query để lấy dữ liệu, join với members và users để lấy tên thành viên liên quan.
    transactions = execute_query(query, (fund_id,))
    # Trả về danh sách giao dịch dưới dạng JSON, trả về danh sách rỗng nếu không có giao dịch nào.
    return jsonify(transactions if transactions else [])

@app.route('/api/transactions', methods=['POST'])
def add_transaction():
    # Thêm một giao dịch mới (thu hoặc chi) cho quỹ.
    data = request.json # Lấy dữ liệu JSON từ request.
    query = """
        INSERT INTO transactions (fund_id, member_id, type, amount, date, description, category)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """
    # Chuẩn bị tham số cho câu truy vấn từ dữ liệu request. member_id có thể là None.
    params = (
        data['fund_id'], data.get('member_id'), data['type'], data['amount'],
        data['date'], data['description'], data['category']
    )
    # Sử dụng hàm helper execute_query để chèn dữ liệu, không cần lấy kết quả.
    transaction_id = execute_query(query, params, fetch=False)
    # Cập nhật số dư (balance) của quỹ sau khi thêm giao dịch.
    update_fund_balance(data['fund_id'], data['type'], data['amount'])
    # Trả về ID của giao dịch vừa thêm và thông báo thành công.
    return jsonify({"id": transaction_id, "message": "Transaction added successfully"})

@app.route('/api/transactions/<int:transaction_id>', methods=['DELETE'])
def delete_transaction(transaction_id):
    # Xóa một giao dịch và đảo ngược ảnh hưởng của nó đến số dư quỹ.

    # Lấy chi tiết giao dịch để đảo ngược cập nhật số dư quỹ.
    query = "SELECT fund_id, type, amount FROM transactions WHERE id = %s"
    # Sử dụng hàm helper để lấy chi tiết giao dịch.
    transaction = execute_query(query, (transaction_id,))
    # Kiểm tra xem giao dịch có tồn tại không.
    if transaction:
        # Lấy thông tin giao dịch từ kết quả truy vấn (kết quả fetchall() trả về list).
        transaction = transaction[0]
        # Đảo ngược loại giao dịch để cập nhật số dư quỹ (thu thành chi, chi thành thu).
        reverse_type = 'expense' if transaction['type'] == 'income' else 'income'
        # Cập nhật lại số dư quỹ bằng cách "đảo ngược" giao dịch.
        update_fund_balance(transaction['fund_id'], reverse_type, transaction['amount'])
        # Xóa giao dịch khỏi bảng transactions.
        query = "DELETE FROM transactions WHERE id = %s"
        execute_query(query, (transaction_id,), fetch=False)
        # Trả về thông báo xóa thành công.
        return jsonify({"message": "Transaction deleted successfully"})
    # Nếu không tìm thấy giao dịch, trả về lỗi 404 Not Found.
    return jsonify({"error": "Transaction not found"}), 404

# Helper function to update fund balance (Hàm hỗ trợ cập nhật số dư quỹ)
# Cập nhật trường 'amount' trong bảng funds dựa trên loại và số tiền giao dịch.
def update_fund_balance(fund_id, transaction_type, amount):
    # Lấy số dư hiện tại của quỹ.
    query = "SELECT amount FROM funds WHERE id = %s"
    # Sử dụng hàm helper để lấy thông tin quỹ.
    fund = execute_query(query, (fund_id,))
    # Kiểm tra xem quỹ có tồn tại không.
    if fund:
        # Lấy số dư hiện tại.
        current_balance = fund[0]['amount']
        # Tính toán số dư mới dựa trên loại giao dịch (cộng nếu là 'income', trừ nếu là 'expense').
        new_balance = current_balance + (amount if transaction_type == 'income' else -amount)
        # Cập nhật số dư mới vào bảng funds.
        query = "UPDATE funds SET amount = %s WHERE id = %s"
        execute_query(query, (new_balance, fund_id), fetch=False)



# ============================= #
#       ROUTING & Thông Báo      #
# ============================= #

# Route để kiểm tra nhóm hiện tại của người dùng
@app.route('/api/user/current-group', methods=['GET'])
def get_current_group():
    user_id = session.get('user_id')
    print(f'GET /api/user/current-group - user_id: {user_id}')
    
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401

    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)

    # Lấy nhóm đầu tiên mà người dùng là thành viên
    cur.execute("""
        SELECT group_id
        FROM members
        WHERE user_id = %s AND status = 'Active'
        ORDER BY id ASC
        LIMIT 1
    """, (user_id,))
    group = cur.fetchone()

    cur.close()
    conn.close()

    if not group:
        return jsonify({'error': 'User is not a member of any group'}), 403

    return jsonify({'group_id': group['group_id']})
# Routes for Notifications (Các Tuyến API cho Thông báo)
# Định nghĩa các tuyến API liên quan đến việc quản lý thông báo (notifications).

@app.route('/api/notifications/<int:group_id>', methods=['GET'])
def get_notifications(group_id):
    # Lấy danh sách các thông báo cho một nhóm cụ thể.
    # Join với members và users để lấy tên người tạo thông báo (member_name).
    query = """
        SELECT n.*, u.full_name AS member_name
        FROM notifications n
        JOIN members m ON n.member_id = m.id
        JOIN users u ON m.user_id = u.id
        WHERE n.group_id = %s
        ORDER BY n.created_at DESC -- Sắp xếp theo thời gian tạo giảm dần (thông báo mới nhất lên đầu).
    """
    # Sử dụng hàm helper execute_query để lấy dữ liệu.
    notifications = execute_query(query, (group_id,))
    # Trả về danh sách thông báo dưới dạng JSON, trả về danh sách rỗng nếu không có thông báo nào.
    return jsonify(notifications if notifications else [])

@app.route('/api/notifications', methods=['POST'])
def add_notification():
    # Thêm một thông báo mới vào nhóm.
    data = request.get_json() # Lấy dữ liệu JSON từ request.
    query = """
        INSERT INTO notifications (group_id, member_id, title, message)
        VALUES (%s, %s, %s, %s)
    """
    # Chuẩn bị tham số cho câu truy vấn từ dữ liệu request.
    params = (data['group_id'], data['member_id'], data['title'], data['message'])
    # Sử dụng hàm helper execute_query để chèn dữ liệu, không cần lấy kết quả (fetch=False).
    execute_query(query, params, fetch=False)

    # Trả về thông báo thành công cùng với group_id và member_id của thông báo.
    return jsonify({
        "group_id": data['group_id'],
        "member_id": data['member_id'],
        "message": "Notification added successfully"
    })

@app.route('/api/notifications/<int:notification_id>/read', methods=['PUT'])
def mark_notification_read(notification_id):
    # Đánh dấu một thông báo cụ thể là đã đọc.
    query = """
        UPDATE notifications
        SET is_read = 1, read_at = CURRENT_TIMESTAMP -- Đặt is_read = 1 và cập nhật thời gian đọc.
        WHERE id = %s
    """
    # Sử dụng hàm helper execute_query để cập nhật dữ liệu, không cần lấy kết quả.
    execute_query(query, (notification_id,), fetch=False)
    # Trả về thông báo cập nhật thành công.
    return jsonify({"message": "Notification marked as read"})

# Routes for Announcements (Các Tuyến API cho Thông báo nội bộ)
# Định nghĩa các tuyến API liên quan đến việc quản lý thông báo nội bộ trong nhóm.

# Nhập các module cần thiết (đã có ở trên, đây chỉ là nhắc lại nếu code bị phân tách)
# from flask import jsonify, session
# from flask import jsonify, session, request
@app.route('/api/announcements/<int:group_id>', methods=['GET'])
def list_announcements(group_id):
    user_id = session.get('user_id')
    print(f'GET /api/announcements/{group_id} - user_id: {user_id}')
    
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401

    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)

    # Kiểm tra xem user có phải là thành viên của nhóm
    cur.execute("""
        SELECT id, status
        FROM members
        WHERE group_id = %s AND user_id = %s AND status = 'Active'
    """, (group_id, user_id))
    member = cur.fetchone()
    print(f'Member check: {member}')

    if not member:
        cur.close()
        conn.close()
        return jsonify({'error': 'User is not a member of this group'}), 403

    # Lấy danh sách thông báo
    cur.execute("""
        SELECT a.id, a.title, a.content, a.priority, a.author_id,
               u.full_name AS author_name,
               a.created_at AS timestamp
        FROM announcements a
        JOIN members m ON a.author_id = m.id
        JOIN users u ON m.user_id = u.id
        WHERE a.group_id = %s
        ORDER BY a.created_at DESC
    """, (group_id,))
    announcements = cur.fetchall()

    for row in announcements:
        cur.execute("""
            SELECT member_id
            FROM announcement_reads
            WHERE announcement_id = %s
        """, (row['id'],))
        row['readBy'] = [r['member_id'] for r in cur.fetchall()]

    cur.close()
    conn.close()
    return jsonify(announcements)
@app.route('/api/announcements', methods=['POST'])
def create_announcement():
    data = request.get_json()
    print(f'POST /api/announcements - data: {data}')

    if 'group_id' not in data or 'author_id' not in data:
        return jsonify({"error": "group_id and author_id are required"}), 400

    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)

    # Kiểm tra xem author_id có phải là thành viên của group_id
    cur.execute("""
        SELECT id, status
        FROM members
        WHERE id = %s AND group_id = %s AND status = 'Active'
    """, (data['author_id'], data['group_id']))
    membership = cur.fetchone()
    print(f'Membership check: {membership}')

    if not membership:
        cur.close()
        conn.close()
        return jsonify({"error": "User is not a member of the group"}), 403

    try:
        cur.execute("""
            INSERT INTO announcements (group_id, author_id, title, content, priority)
            VALUES (%s, %s, %s, %s, %s)
        """, (data['group_id'], data['author_id'], data['title'], data['content'], data['priority']))
        conn.commit()
    except mysql.connector.Error as err:
        print(f"Error creating announcement: {err}")
        conn.rollback()
        cur.close()
        conn.close()
        return jsonify({"error": f"Database error: {str(err)}"}), 500
    except Exception as err:
        print(f"Unexpected error creating announcement: {err}")
        conn.rollback()
        cur.close()
        conn.close()
        return jsonify({"error": f"System error: {str(err)}"}), 500

    cur.close()
    conn.close()
    return jsonify({"message": "Announcement created successfully"})
# Tuyến API để đánh dấu thông báo nội bộ là đã đọc.
@app.route('/api/announcements/<int:announcement_id>/read', methods=['POST'])
def mark_as_read(announcement_id):
    data = request.get_json()
    member_id = data.get('member_id')

    if not member_id:
        return jsonify({"error": "member_id is required"}), 400

    query = """
        INSERT INTO announcement_reads (announcement_id, member_id)
        VALUES (%s, %s)
        ON DUPLICATE KEY UPDATE read_at = CURRENT_TIMESTAMP
    """
    params = (announcement_id, member_id)
    execute_query(query, params, fetch=False)

    return jsonify({"message": "Announcement marked as read"})
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


# ============================= #
#       ROUTING & Nấu ăn     #
# ============================= #


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

# ============================= #
#       ROUTING & Chat     #
# ============================= #


# lấy list danh sach chat
@app.route('/api/chat-groups', methods=['GET'])
def get_user_chat_groups():
    # Lấy user_id từ session
    user_id = session.get('user_id')
    print(f"Session user_id: {user_id}")

    if not user_id:
        print("No user_id in session")
        return jsonify({'error': 'User not logged in or session expired'}), 401

    # Lấy tham số phân trang
    limit = request.args.get('limit', 25, type=int)
    offset = request.args.get('offset', 0, type=int)
    print(f"Pagination: limit={limit}, offset={offset}")

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Query lấy danh sách nhóm mà user tham gia
        query = """
        SELECT 
            g.id AS group_id,
            g.group_name
        FROM groups g
        INNER JOIN members m ON m.group_id = g.id
        WHERE m.user_id = %s AND m.status = 'Active'
        LIMIT %s OFFSET %s
        """
        cursor.execute(query, (user_id, limit, offset))
        groups = cursor.fetchall()
        print(f"Groups found: {groups}")

        if not groups:
            print("No groups found for user")
            cursor.close()
            conn.close()
            return jsonify([]), 200

        result = []
        for group in groups:
            group_id = group['group_id']
            print(f"Processing group: {group_id} - {group['group_name']}")

            # Query lấy danh sách thành viên trong nhóm, loại bỏ user_id hiện tại
            members_query = """
            SELECT 
                u.id AS user_id,
                u.full_name,
                m.avatar
            FROM users u
            INNER JOIN members m ON m.user_id = u.id
            WHERE m.group_id = %s AND m.status = 'Active' AND m.user_id != %s
            """
            cursor.execute(members_query, (group_id, user_id))
            members = cursor.fetchall()
            print(f"Members for group {group_id}: {members}")

            result.append({
                'group_id': group_id,
                'group_name': group['group_name'],
                'members': members
            })

        cursor.close()
        conn.close()
        print(f"Final result: {result}")
        return jsonify(result), 200

    except Error as e:
        print(f"Database error: {str(e)}")
        return jsonify({'error': f'Database error: {str(e)}'}), 500
    except Exception as e:
        print(f"Server error: {str(e)}")
        return jsonify({'error': f'Server error: {str(e)}'}), 500
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
@app.route('/api/conversations', methods=['POST'])
def create_conversation():
    data = request.get_json()
    print(f"[create_conversation] Request data: {data}")

    if not data or 'is_group' not in data or ('is_group' in data and data['is_group'] and 'group_id' not in data):
        print("[create_conversation] Missing required fields")
        return jsonify({'error': 'Missing required fields'}), 400

    is_group = data.get('is_group', False)
    group_id = data.get('group_id') if is_group else None
    participants = data.get('participants', [])

    if not participants:
        print("[create_conversation] No participants provided")
        return jsonify({'error': 'At least one participant is required'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Tạo cuộc trò chuyện
        cursor.execute(
            "INSERT INTO conversations_chat (is_group, group_id) VALUES (%s, %s)",
            (is_group, group_id)
        )
        conversation_id = cursor.lastrowid
        print(f"[create_conversation] Created conversation_id: {conversation_id}")

        # Thêm participants
        for user_id in participants:
            cursor.execute(
                "INSERT INTO conversation_participants_chat (conversation_id, user_id, joined_at) VALUES (%s, %s, NOW())",
                (conversation_id, user_id)
            )
        conn.commit()

        cursor.close()
        conn.close()
        print(f"[create_conversation] Conversation created successfully")
        return jsonify({
            'conversation_id': conversation_id,
            'message': 'Conversation created successfully'
        }), 201

    except Error as e:
        print(f"[create_conversation] Database error: {str(e)}")
        return jsonify({'error': f'Database error: {str(e)}'}), 500
    except Exception as e:
        print(f"[create_conversation] Server error: {str(e)}")
        return jsonify({'error': f'Server error: {str(e)}'}), 500
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

# Endpoint lấy danh sách cuộc trò chuyện nhóm và thành viên

@app.route('/api/conversations', methods=['GET'])
@require_auth
def get_conversations():
    """
    Lấy danh sách conversations (group hoặc private) mà user đang tham gia.
    Cho phép filter bằng query-param `is_group`:
      - is_group=1: chỉ group chat
      - is_group=0: chỉ private chat
      - không truyền: lấy tất cả
    """
    try:
        user_id = request.user_id
        is_group_param = request.args.get('is_group')
        is_group_filter = None
        if is_group_param in ('0', '1'):
            is_group_filter = int(is_group_param)

        # Debug thông tin đầu vào
        print(f"[DEBUG] get_conversations called with user_id={user_id}, is_group_filter={is_group_filter}")

        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        # Chỉ dùng conversation_participants_chat để xác định các conversation user tham gia
        base_query = """
            SELECT
                c.id,
                c.is_group,
                c.group_id,
                g.group_name,
                n.unread_count,
                COALESCE(n.is_muted, 0) AS is_muted,
                lm.id AS last_message_id,
                lm.content AS last_message_content,
                lm.timestamp AS last_message_timestamp,
                u.full_name AS last_message_sender_name
            FROM conversations_chat c
            LEFT JOIN groups g ON c.group_id = g.id
            JOIN conversation_participants_chat cp
                ON c.id = cp.conversation_id AND cp.user_id = %s
            LEFT JOIN notifications_chat n
                ON c.id = n.conversation_id AND n.user_id = %s
            LEFT JOIN (
                SELECT m1.conversation_id, m1.id, m1.content, m1.timestamp, m1.sender_id
                FROM messages_chat m1
                JOIN (
                    SELECT conversation_id, MAX(timestamp) AS ts
                    FROM messages_chat
                    GROUP BY conversation_id
                ) t ON m1.conversation_id = t.conversation_id AND m1.timestamp = t.ts
            ) lm ON c.id = lm.conversation_id
            LEFT JOIN users u ON lm.sender_id = u.id
            WHERE 1 = 1
        """
        params = [user_id, user_id]

        if is_group_filter is not None:
            base_query += " AND c.is_group = %s"
            params.append(is_group_filter)

        base_query += " ORDER BY lm.timestamp DESC"

        # Debug câu SQL và params
        print("[DEBUG] Executing SQL:")
        print(base_query)
        print(f"[DEBUG] Params: {params}")

        cursor.execute(base_query, params)
        conversations = cursor.fetchall()

        # Debug số lượng conversation
        print(f"[DEBUG] Retrieved {len(conversations)} conversations from DB")

        result = []
        for conv in conversations:
            print(f"[DEBUG] Processing conversation: {conv}")

            # Lấy thành viên tùy loại conversation
            if conv['is_group']:
                cursor.execute(
                    """
                    SELECT u.id, u.full_name, m.role, m.status
                    FROM members m
                    JOIN users u ON m.user_id = u.id
                    WHERE m.group_id = %s
                    """, (conv['group_id'],)
                )
                members = cursor.fetchall()
                print(f"[DEBUG] Retrieved {len(members)} group members for group_id={conv['group_id']}")
            else:
                cursor.execute(
                    """
                    SELECT u.id, u.full_name
                    FROM conversation_participants_chat cp
                    JOIN users u ON cp.user_id = u.id
                    WHERE cp.conversation_id = %s
                    """, (conv['id'],)
                )
                members = cursor.fetchall()
                print(f"[DEBUG] Retrieved {len(members)} private chat participants for conversation_id={conv['id']}")

            conversation_data = {
                "id": conv['id'],
                "is_group": bool(conv['is_group']),
                "group_id": conv['group_id'],
                "group_name": conv['group_name'],
                "members": [
                    {
                        "id": m['id'],
                        "full_name": m['full_name'],
                        "avatar": m['full_name'][:2],
                        "role": m.get('role'),
                        "status": m.get('status')
                    } for m in members
                ],
                "unread_count": conv['unread_count'] or 0,
                "is_muted": bool(conv['is_muted']),
                "last_message": None
            }

            if conv['last_message_id']:
                conversation_data['last_message'] = {
                    "id": conv['last_message_id'],
                    "content": conv['last_message_content'],
                    "timestamp": conv['last_message_timestamp'].isoformat(),
                    "sender_name": conv['last_message_sender_name']
                }
                print(f"[DEBUG] Last message: {conversation_data['last_message']}")

            result.append(conversation_data)

        cursor.close()
        connection.close()

        print(f"[DEBUG] Final result list length: {len(result)}")
        return jsonify({"conversations": result}), 200

    except mysql.connector.Error as e:
        print(f"[ERROR] SQL Error in get_conversations: {e}")
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        print(f"[ERROR] Unexpected error in get_conversations: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/menus/preparing/count', methods=['GET'])
def get_preparing_menu_count():
    try:
        # Lấy user_id từ session
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({
                'status': 'error',
                'message': 'Bạn cần đăng nhập để thực hiện thao tác này'
            }), 401

        # Lấy kết nối database
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        # Query để đếm số lượng món ăn trạng thái 'Preparing' trong các nhóm mà user tham gia
        query = """
            SELECT COUNT(m.id) as preparing_count
            FROM menus m
            INNER JOIN groups g ON m.group_id = g.id
            INNER JOIN members mem ON g.id = mem.group_id
            WHERE mem.user_id = %s
            AND m.status = 'Preparing'
        """
        cursor.execute(query, (user_id,))
        result = cursor.fetchone()

        # Đóng kết nối
        cursor.close()
        connection.close()

        # Trả về kết quả
        return jsonify({
            'status': 'success',
            'preparing_count': result['preparing_count']
        }), 200

    except Exception as e:
        # Xử lý lỗi
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

from flask import Flask, jsonify, session
from datetime import datetime
from dateutil.relativedelta import relativedelta
import mysql.connector
from datetime import datetime
from dateutil.relativedelta import relativedelta

@app.route('/api/funds/percentage_change', methods=['GET'])
def get_fund_percentage_change():
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        conn = get_db_connection()
        cursor = conn.cursor()

        # 1. Lấy danh sách group_ids
        cursor.execute("""
            SELECT group_id
            FROM members
            WHERE user_id = %s AND status = 'Active'
        """, (user_id,))
        group_ids = [row[0] for row in cursor.fetchall()]

        if not group_ids:
            return jsonify({'percentage_change': 0, 'message': 'User is not in any group'}), 200

        # 2. Tạo placeholder cho IN‑clause
        placeholders = ','.join(['%s'] * len(group_ids))

        # 3. Lấy tổng số dư quỹ hiện tại
        sql_current = f"""
            SELECT SUM(amount)
            FROM funds
            WHERE group_id IN ({placeholders})
        """
        cursor.execute(sql_current, tuple(group_ids))
        current_amount = cursor.fetchone()[0] or 0

        # 4. Tính ngày cuối của tháng trước
        first_day_this_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        last_month_end = first_day_this_month - relativedelta(days=1)

        # 5. Lấy số dư quỹ tại cuối tháng trước (tổng của tất cả giao dịch)
        sql_prev = f"""
            SELECT SUM(
                CASE WHEN type = 'income' THEN amount
                     ELSE -amount
                END
            )
            FROM transactions
            WHERE fund_id IN (
                SELECT id FROM funds WHERE group_id IN ({placeholders})
            )
            AND date <= %s
        """
        params_prev = tuple(group_ids) + (last_month_end,)
        cursor.execute(sql_prev, params_prev)
        previous_amount = cursor.fetchone()[0] or 0

        # 6. Tính phần trăm thay đổi
        if previous_amount == 0:
            percentage_change = 100.0 if current_amount > 0 else 0.0
        else:
            percentage_change = ((current_amount - previous_amount) / previous_amount) * 100

        cursor.close()
        conn.close()

        return jsonify({
            'percentage_change': round(percentage_change, 2),
            'current_amount': float(current_amount),
            'previous_amount': float(previous_amount),
            'last_month_end': last_month_end.strftime('%Y-%m-%d')
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
# lấy tv trong tháng hiện tại
@app.route('/api/members/new/count', methods=['GET'])
def get_new_members():
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        conn = get_db_connection()
        cursor = conn.cursor()

        # Lấy danh sách nhóm mà user tham gia
        cursor.execute("""
            SELECT group_id 
            FROM members 
            WHERE user_id = %s AND status = 'Active'
        """, (user_id,))
        group_ids = [row[0] for row in cursor.fetchall()]

        if not group_ids:
            return jsonify({'new_members': 0, 'message': 'User is not in any group'}), 200

        # Đếm số thành viên mới trong tháng hiện tại
        cursor.execute("""
            SELECT COUNT(*) 
            FROM members 
            WHERE group_id IN (%s) 
            AND status = 'Active' 
            AND YEAR(join_date) = YEAR(CURRENT_DATE) 
            AND MONTH(join_date) = MONTH(CURRENT_DATE)
        """ % ','.join(['%s'] * len(group_ids)), group_ids)
        new_members_count = cursor.fetchone()[0]

        cursor.close()
        conn.close()

        return jsonify({'new_members': new_members_count}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
# thanh viên chưa góp tháng này
@app.route('/api/contributions/pending/count', methods=['GET'])
def get_pending_contributions():
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        conn = get_db_connection()
        cursor = conn.cursor()

        # Lấy danh sách nhóm mà user tham gia
        cursor.execute("""
            SELECT group_id 
            FROM members 
            WHERE user_id = %s AND status = 'Active'
        """, (user_id,))
        group_ids = [row[0] for row in cursor.fetchall()]

        if not group_ids:
            return jsonify({'pending_contributions': 0, 'message': 'User is not in any group'}), 200

        # Đếm số thành viên chưa đóng góp trong tháng hiện tại
        cursor.execute("""
            SELECT COUNT(DISTINCT m.id)
            FROM members m
            LEFT JOIN member_contributions mc 
                ON m.id = mc.member_id 
                AND mc.period = 'monthly'
                AND YEAR(mc.last_paid) = YEAR(CURRENT_DATE)
                AND MONTH(mc.last_paid) = MONTH(CURRENT_DATE)
                AND mc.paid = 1
            WHERE m.group_id IN (%s)
            AND m.status = 'Active'
            AND mc.id IS NULL
        """ % ','.join(['%s'] * len(group_ids)), group_ids)
        pending_contributions = cursor.fetchone()[0]

        cursor.close()
        conn.close()

        return jsonify({'pending_contributions': pending_contributions}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
# 4. Route: Lấy số yêu cầu đang xử lý
@app.route('/api/requests/pending/count', methods=['GET'])
def get_pending_requests():
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        conn = get_db_connection()
        cursor = conn.cursor()

        # Lấy danh sách nhóm mà user tham gia
        cursor.execute("""
            SELECT group_id 
            FROM members 
            WHERE user_id = %s AND status = 'Active'
        """, (user_id,))
        group_ids = [row[0] for row in cursor.fetchall()]

        if not group_ids:
            return jsonify({'pending_requests': 0, 'message': 'User is not in any group'}), 200

        # Đếm số yêu cầu đang xử lý (thành viên Pending)
        cursor.execute("""
            SELECT COUNT(*) 
            FROM members 
            WHERE group_id IN (%s) 
            AND status = 'Pending'
        """ % ','.join(['%s'] * len(group_ids)), group_ids)
        pending_requests = cursor.fetchone()[0]

        cursor.close()
        conn.close()

        return jsonify({'pending_requests': pending_requests}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
if __name__ == '__main__':
    app.run(debug=True)
