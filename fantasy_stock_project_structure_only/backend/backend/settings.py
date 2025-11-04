import os
from pathlib import Path

# Build paths inside the project
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING
SECRET_KEY = 'django-insecure-CHANGE_THIS_KEY'

DEBUG = True
ALLOWED_HOSTS = [
    os.getenv('ALLOWED_HOSTS','ChanghaLee.pythonanywhere.com'),'*.pythonanywhere.com','*','.pythonanywhere.com',
]



# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',

    'accounts',
    'stocks',
    'leagues',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # CORS
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'frontend'],  # For React index.html
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend.wsgi.application'

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    # {
    #     'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    # },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
"OPTIONS": {"min_length": 1},
    },
]

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

# CORS
# CORS / CSRF
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    # Vercel 프리뷰/프로덕션 도메인들
    "https://2025-changha-react.vercel.app",
    "https://2025-changha-react.vercel.app",
]
CSRF_TRUSTED_ORIGINS = [
    "https://ChanghaLee.pythonanywhere.com",
    "https://2025-changha-react.vercel.app",
    "https://2025-changha-react.vercel.app",
]

# Static files
STATIC_URL = '/static/'
STATICFILES_DIRS = [BASE_DIR / 'frontend' / 'dist']

# Custom user model
AUTH_USER_MODEL = 'accounts.CustomUser'

# Default auto field
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

SEC_CONTACT_EMAIL = "changhalee2025@gmail.com"


MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')