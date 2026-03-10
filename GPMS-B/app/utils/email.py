# app\utils\email.py 
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv
import os
import ssl
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID
from app.db.models.user import User
from app.db.models.profile import Profile

# Load environment variables from .env file
load_dotenv()

# For generated account 
def send_email(to_email: str, password: str):
    from_email = os.getenv("EMAIL_ADDRESS")
    from_password = os.getenv("EMAIL_PASSWORD")
    smtp_server = os.getenv("SMTP_SERVER")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    login_domain = "www.sample.com"

    msg = MIMEMultipart("alternative")
    msg['From'] = from_email
    msg['To'] = to_email
    msg['Subject'] = "Your Account Password"

    # HTML content
    html_content = f"""
    <html>
    <head>
        <style>
            body {{
                font-family: "Segoe UI", Arial, sans-serif;
                line-height: 1.6;
                color: #333333;
                margin: 0;
                padding: 0;
            }}
            .container {{
                max-width: 600px;
                margin: 0 auto;
                border-radius: 8px 8px 0 0;
                border: #333333 1px solid;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }}
            .header {{
                background-color: #1a2635;
                color: white;
                padding: 30px;
                text-align: center;
                border-radius: 8px 8px 0 0;
            }}
            .header img {{
                max-width: 55%;
                height: auto;
            }}
            .content {{
                background-color: #ffffff;
                padding: 30px;
                padding-bottom: 10px;
                border-radius: 0 0 8px 8px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }}
            .footer {{
                text-align: center;
                margin-top: 20px;
                color: #6b7280;
                font-size: 0.875rem;
            }}
            .login-link {{
                display: block;
                margin-top: 15px;
                font-size: 0.9rem;
                color: #2e435d;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="https://i.im.ge/2025/03/09/pFfE8m.gatepass-logo.png" alt="GATEPASS ACCOUNT" style="max-width: 290px; height: auto;">
            </div>
            <div class="content">
                <p style="font-size: 16px; font-weight: 600">Here's your Generated Account:</p>
                <p style="font-size: 16px;"><strong>Email:</strong> {to_email}</p>
                <p style="font-size: 16px;"><strong>Password:</strong> {password}</p>
                <p style="font-size: 14px; color: #d32f2f; margin-top: 10px;"><i>For security reasons, please do not share your password with anyone.</i></p>
                <i style="padding-top: 5px;">
                    <a href="https://{login_domain}/login" class="login-link" style="font-size: 14px;">Click here to log in.</a>
                </i>
            </div>
            <hr style="border: 0; border-top: 1px solid #e5e7eb; margin-bottom: 5px; margin-top: 3px;">
            <div class="footer">
                <p>© {datetime.now().year} Office of the Campus Safety and Security Services. All rights reserved.</p>
                <p>This is an automated message, please do not reply.</p>
            </div>
        </div>
    </body>
    </html>
    """

    part = MIMEText(html_content, "html")
    msg.attach(part)

    context = ssl.create_default_context()

    try:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls(context=context)
            server.login(from_email, from_password)
            server.sendmail(from_email, to_email, msg.as_string())
        # print(f"Email sent to {to_email}")
        # print(f"HTML content sent:\n{html_content}")
        print(f"Generated account email sent to {to_email}")
    except Exception as e:
        print(f"Failed to send email to {to_email}: {e}")

def send_password_reset_otp(to_email: str, otp: str):
    """Send password reset OTP email to the user"""
    from_email = os.getenv("EMAIL_ADDRESS")
    from_password = os.getenv("EMAIL_PASSWORD")
    smtp_server = os.getenv("SMTP_SERVER")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    login_domain = "www.sample.com"

    msg = MIMEMultipart("alternative")
    msg['From'] = from_email
    msg['To'] = to_email
    msg['Subject'] = "Password Reset OTP"

    # HTML content
    html_content = f"""
    <html>
    <head>
        <style>
            body {{
                font-family: "Segoe UI", Arial, sans-serif;
                line-height: 1.6;
                color: #333333;
                margin: 0;
                padding: 0;
            }}
            .container {{
                max-width: 600px;
                margin: 0 auto;
                border-radius: 8px 8px 0 0;
                border: #333333 1px solid;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }}
            .header {{
                background-color: #1a2635;
                color: white;
                padding: 30px;
                text-align: center;
                border-radius: 8px 8px 0 0;
            }}
            .header img {{
                max-width: 55%;
                height: auto;
            }}
            .content {{
                background-color: #ffffff;
                padding: 30px;
                padding-bottom: 10px;
                border-radius: 0 0 8px 8px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }}
            .footer {{
                text-align: center;
                margin-top: 20px;
                color: #6b7280;
                font-size: 0.875rem;
            }}
            .otp {{
                font-size: 24px;
                font-weight: bold;
                letter-spacing: 5px;
                text-align: center;
                margin: 20px 0;
                padding: 10px;
                background-color: #f3f4f6;
                border-radius: 4px;
            }}
            .login-link {{
                display: block;
                margin-top: 15px;
                font-size: 0.9rem;
                color: #2e435d;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="https://i.im.ge/2025/03/09/pFfE8m.gatepass-logo.png" alt="GATEPASS ACCOUNT" style="max-width: 290px; height: auto;">
            </div>
            <div class="content">
                <p style="font-size: 16px; font-weight: 600">Password Reset Request</p>
                <p>We received a request to reset your password. Please use the following OTP code to reset your password:</p>
                
                <div class="otp">{otp}</div>
                
                <p style="font-size: 14px; color: #d32f2f; margin-top: 10px;"><i>This OTP will expire in 15 minutes. If you did not request a password reset, please ignore this email.</i></p>
            </div>
            <hr style="border: 0; border-top: 1px solid #e5e7eb; margin-bottom: 5px; margin-top: 3px;">
            <div class="footer">
                <p>© {datetime.now().year} Office of the Campus Safety and Security Services. All rights reserved.</p>
                <p>This is an automated message, please do not reply.</p>
            </div>
        </div>
    </body>
    </html>
    """

    part = MIMEText(html_content, "html")
    msg.attach(part)

    context = ssl.create_default_context()

    try:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls(context=context)
            server.login(from_email, from_password)
            server.sendmail(from_email, to_email, msg.as_string())
        print(f"Password reset OTP sent to {to_email}")
        return True
    except Exception as e:
        print(f"Failed to send password reset OTP to {to_email}: {e}")
        raise e


def send_email_change_otp(to_email: str, otp: str):
    """Send OTP for confirming a new email address."""
    from_email = os.getenv("EMAIL_ADDRESS")
    from_password = os.getenv("EMAIL_PASSWORD")
    smtp_server = os.getenv("SMTP_SERVER")
    smtp_port = int(os.getenv("SMTP_PORT", 587))

    msg = MIMEMultipart("alternative")
    msg["From"] = from_email
    msg["To"] = to_email
    msg["Subject"] = "Confirm your new email address"

    html_content = f"""
    <html>
    <body style="font-family:Segoe UI,Arial,sans-serif;color:#333">
        <h2>Confirm your new email address</h2>
        <p>Use this OTP code to complete your email update request:</p>
        <p style="font-size:24px;font-weight:700;letter-spacing:4px">{otp}</p>
        <p>This code expires in 15 minutes.</p>
        <p>If you did not request this change, ignore this email.</p>
    </body>
    </html>
    """

    msg.attach(MIMEText(html_content, "html"))
    context = ssl.create_default_context()
    with smtplib.SMTP(smtp_server, smtp_port) as server:
        server.starttls(context=context)
        server.login(from_email, from_password)
        server.sendmail(from_email, to_email, msg.as_string())


def send_email_change_alert_to_old_email(old_email: str, new_email: str):
    """Security notice sent to the old email when a change request is made."""
    from_email = os.getenv("EMAIL_ADDRESS")
    from_password = os.getenv("EMAIL_PASSWORD")
    smtp_server = os.getenv("SMTP_SERVER")
    smtp_port = int(os.getenv("SMTP_PORT", 587))

    msg = MIMEMultipart("alternative")
    msg["From"] = from_email
    msg["To"] = old_email
    msg["Subject"] = "Email change request detected"

    html_content = f"""
    <html>
    <body style="font-family:Segoe UI,Arial,sans-serif;color:#333">
        <h2>Email change request</h2>
        <p>We detected a request to change your account email.</p>
        <p><strong>Requested new email:</strong> {new_email}</p>
        <p>No changes are applied until verification is completed.</p>
        <p>If this wasn't you, reset your password immediately.</p>
    </body>
    </html>
    """

    msg.attach(MIMEText(html_content, "html"))
    context = ssl.create_default_context()
    with smtplib.SMTP(smtp_server, smtp_port) as server:
        server.starttls(context=context)
        server.login(from_email, from_password)
        server.sendmail(from_email, old_email, msg.as_string())


def send_email_change_success_notice(old_email: str, new_email: str):
    """Confirmation notice after email change is completed."""
    from_email = os.getenv("EMAIL_ADDRESS")
    from_password = os.getenv("EMAIL_PASSWORD")
    smtp_server = os.getenv("SMTP_SERVER")
    smtp_port = int(os.getenv("SMTP_PORT", 587))

    msg = MIMEMultipart("alternative")
    msg["From"] = from_email
    msg["To"] = old_email
    msg["Subject"] = "Your account email was changed"

    html_content = f"""
    <html>
    <body style="font-family:Segoe UI,Arial,sans-serif;color:#333">
        <h2>Email updated successfully</h2>
        <p>Your account email has been changed from this address to:</p>
        <p><strong>{new_email}</strong></p>
        <p>If this was not you, contact support immediately.</p>
    </body>
    </html>
    """

    msg.attach(MIMEText(html_content, "html"))
    context = ssl.create_default_context()
    with smtplib.SMTP(smtp_server, smtp_port) as server:
        server.starttls(context=context)
        server.login(from_email, from_password)
        server.sendmail(from_email, old_email, msg.as_string())

async def send_verification_email(to_email: str, otp: str):
    """Send verification OTP code via email"""
    from_email = os.getenv("EMAIL_ADDRESS")
    from_password = os.getenv("EMAIL_PASSWORD")
    smtp_server = os.getenv("SMTP_SERVER")
    smtp_port = int(os.getenv("SMTP_PORT", 587))

    msg = MIMEMultipart("alternative")
    msg['From'] = from_email
    msg['To'] = to_email
    msg['Subject'] = "Your Email Verification Code"

    html_content = f"""
    <html>
    <head>
        <style>
            body {{
                font-family: "Segoe UI", Arial, sans-serif;
                line-height: 1.6;
                color: #333333;
                margin: 0;
                padding: 0;
            }}
            .container {{
                max-width: 600px;
                margin: 0 auto;
                border-radius: 8px 8px 0 0;
                border: #333333 1px solid;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }}
            .header {{
                background-color: #1a2635;
                color: white;
                padding: 30px;
                text-align: center;
                border-radius: 8px 8px 0 0;
            }}
            .header img {{
                max-width: 55%;
                height: auto;
            }}
            .content {{
                background-color: #ffffff;
                padding: 30px;
                text-align: center;
                border-radius: 0 0 8px 8px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }}
            .otp {{
                font-size: 24px;
                font-weight: bold;
                letter-spacing: 5px;
                text-align: center;
                margin: 20px 0;
                padding: 10px;
                background-color: #f3f4f6;
                border-radius: 4px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="https://i.im.ge/2025/03/09/pFfE8m.gatepass-logo.png" 
                     alt="GATEPASS ACCOUNT" 
                     style="max-width: 290px; height: auto;">
            </div>
            <div class="content">
                <h2>Verify Your Email Address</h2>
                <p>Please use the verification code below to verify your email address:</p>
                
                <div class="otp">{otp}</div>
                
                <p style="color: #d32f2f; font-size: 14px;">
                    This code will expire in 15 minutes.<br>
                    If you didn't create an account, please ignore this email.
                </p>
            </div>
            <div class="footer">
                <p>© {datetime.now().year} Office of the Campus Safety and Security Services</p>
                <p>This is an automated message, please do not reply.</p>
            </div>
        </div>
    </body>
    </html>
    """

    part = MIMEText(html_content, "html")
    msg.attach(part)

    context = ssl.create_default_context()

    try:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls(context=context)
            server.login(from_email, from_password)
            server.sendmail(from_email, to_email, msg.as_string())
        print(f"Verification email sent to {to_email}")
        return True
    except Exception as e:
        print(f"Failed to send verification email to {to_email}: {e}")
        return False

# Add new function for payment slip notification
async def send_payment_slip_email(
    db: AsyncSession,
    user_id: UUID,
    nature_of_payment: str,
    total_amount: float
) -> bool:
    """Send gatepass/payment slip details via email to applicant after application submission."""
    try:
        # Get user and optional profile (left join so missing profile doesn't block email)
        query = (
            select(User, Profile)
            .outerjoin(Profile, User.user_id == Profile.user_id)
            .where(User.user_id == user_id)
        )
        result = await db.execute(query)
        row = result.one_or_none()
        if not row:
            print(f"Gatepass slip email skipped: user_id={user_id} not found.")
            return False

        user, profile = row
        full_name = f"{profile.first_name} {profile.last_name}" if profile else "Applicant"
        amount = float(total_amount) if total_amount is not None else 0.0

        from_email = os.getenv("EMAIL_ADDRESS")
        from_password = os.getenv("EMAIL_PASSWORD")
        smtp_server = os.getenv("SMTP_SERVER")
        smtp_port = int(os.getenv("SMTP_PORT", 587))

        if not all([from_email, from_password, smtp_server]):
            print("Gatepass slip email skipped: EMAIL_ADDRESS, EMAIL_PASSWORD, or SMTP_SERVER not set in environment.")
            return False

        msg = MIMEMultipart("alternative")
        msg['From'] = from_email
        msg['To'] = user.email
        msg['Subject'] = "GatePass Payment Slip"

        # HTML content
        html_content = f"""
        <html>
        <head>
            <style>
                body {{
                    font-family: "Segoe UI", Arial, sans-serif;
                    line-height: 1.6;
                    color: #333333;
                    margin: 0;
                    padding: 0;
                }}
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    border-radius: 8px 8px 0 0;
                    border: #333333 1px solid;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                }}
                .header {{
                    background-color: #1a2635;
                    color: white;
                    padding: 30px;
                    text-align: center;
                    border-radius: 8px 8px 0 0;
                }}
                .content {{
                    background-color: #ffffff;
                    padding: 30px;
                    text-align: left;
                    border-radius: 0 0 8px 8px;
                }}
                .footer {{
                    text-align: center;
                    margin-top: 20px;
                    color: #6b7280;
                    font-size: 0.875rem;
                }}
                .payment-details {{
                    background-color: #f8f9fa;
                    padding: 20px;
                    border-radius: 8px;
                    margin: 15px 0;
                }}
                
                .payment-title {{
                    color: #1a2635;
                    font-size: 22px;
                    font-weight: 600;
                    margin: 0 0 15px 0;
                    padding-bottom: 10px;
                    border-bottom: 2px solid #e0e0e0;
                }}
                
                .detail-row {{
                    margin: 10px 0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 0;
                }}
                
                .detail-label {{
                    font-weight: 600;
                    color: #4a5568;
                    width: 40%;
                }}
                
                .detail-value {{
                    color: #1a2635;
                    width: 60%;
                    text-align: right;
                }}
                
                .amount-value {{
                    color: #2e7d32;
                    font-size: 18px;
                    font-weight: 600;
                }}
                .issuer-section {{
                    margin-top: 20px;
                    padding: 15px;
                    background-color: #f8f9fa;
                    border-radius: 8px;
                }}

                .issuer-label {{
                    color: #4a5568;
                    font-weight: 600;
                    margin-bottom: 5px;
                }}

                .issuer-value {{
                    color: #1a2635;
                    font-weight: 600;
                    font-size: 16px;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <img src="https://i.im.ge/2025/03/09/pFfE8m.gatepass-logo.png" 
                         alt="GATEPASS" 
                         style="max-width: 290px; height: auto;">
                </div>
                <div class="content">
                    <h2 class="payment-title">Payment Slip</h2>
                    <div class="payment-details">
                        <div class="detail-row">
                            <span class="detail-label">Name:</span>
                            <span class="detail-value">{full_name}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Nature of Payment:</span>
                            <span class="detail-value">{nature_of_payment}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Amount:</span>
                            <span class="detail-value amount-value">₱{amount:,.2f}</span>
                        </div>
                    </div>
                    <div class="issuer-section">
                        <p class="issuer-label">Issued by:</p>
                        <p class="issuer-value">GatePass CSU</p>
                    </div>
                </div>
                <div class="footer">
                    <p>© {datetime.now().year} Office of the Campus Safety and Security Services</p>
                    <p>This is an automated message, please do not reply.</p>
                </div>
            </div>
        </body>
        </html>
        """

        part = MIMEText(html_content, "html")
        msg.attach(part)

        context = ssl.create_default_context()

        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls(context=context)
            server.login(from_email, from_password)
            server.sendmail(from_email, user.email, msg.as_string())
        
        print(f"Gatepass slip email sent to {user.email}")
        return True

    except Exception as e:
        print(f"Gatepass slip email failed (user_id={user_id}): {e!r}")
        return False
