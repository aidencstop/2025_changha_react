from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.authtoken.models import Token
from rest_framework.views import APIView
from django.contrib.auth import logout

from .models import CustomUser
from .serializers import RegisterSerializer, LoginSerializer, UserSerializer
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated

class RegisterView(generics.CreateAPIView):
    queryset = CustomUser.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data
            token, created = Token.objects.get_or_create(user=user)
            return Response({'token': token.key})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LogoutView(APIView):
    authentication_classes = [TokenAuthentication]

    def post(self, request):
        request.user.auth_token.delete()
        logout(request)
        return Response({"detail": "Logged out successfully."})

class UserDetailView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

# accounts/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import password_validation, get_user_model
from rest_framework import status

from .serializers import ProfileSerializer  # 출력/입력용(필드만)

User = get_user_model()

class MeProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        ser = ProfileSerializer(request.user)
        return Response(ser.data)

    def put(self, request):
        user = request.user

        # ----- 1) 프로필 필드 업데이트(first/last/email) -----
        # 비밀번호 로직과 분리: 비번 필드는 직렬화에서 제외하고 필드만 검증/저장
        fields_payload = {
            k: v for k, v in request.data.items()
            if k in ("first_name", "last_name", "email")
        }
        ser = ProfileSerializer(user, data=fields_payload, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()

        # ----- 2) 비밀번호 분기 -----
        cur = (request.data.get("current_password") or "").strip()
        new = (request.data.get("new_password") or "").strip()

        # 기본 응답 값
        message = "Profile updated"
        password_changed = False
        reload_required = True  # 0~3은 리로드, 4는 리로드 안 함(요구사항)

        if not cur and not new:
            # 0. 둘 다 미입력 → 필드만 저장, 리로드
            message = "Profile updated"
            password_changed = False
            reload_required = True

        elif cur and not new:
            # 1. current만 입력
            message = "To change your password, enter new password"
            password_changed = False
            reload_required = True

        elif (not cur and new) or (cur and not user.check_password(cur)):
            # 2. new만 입력 or current가 틀림
            message = "Enter correct current password"
            password_changed = False
            reload_required = True

        else:
            # cur과 new가 모두 있고, current는 맞는 상태
            if cur == new:
                # 3. 새 비밀번호가 현재와 동일
                message = "New password should be different with current password"
                password_changed = False
                reload_required = True
            else:
                # 4. current == user_pw AND new != current → 실제 변경
                try:
                    password_validation.validate_password(new, user=user)
                    user.set_password(new)
                    user.save()
                    message = "Password successfully changed"
                    password_changed = True
                    reload_required = False
                except Exception as e:
                    # (옵션) Django 비밀번호 정책 위반 시
                    message = str(e)
                    password_changed = False
                    reload_required = True

        # 최종 응답(200 유지)
        data = {
            "user": ProfileSerializer(user).data,
            "message": message,
            "password_changed": password_changed,
            "reload": reload_required,
        }
        return Response(data, status=status.HTTP_200_OK)

from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser

from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password

from .serializers import ProfileSerializer
@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def profile_view(request):
    user = request.user

    if request.method == 'GET':
        ser = ProfileSerializer(user, context={'request': request})
        return Response(ser.data, status=200)

    # PUT: 기존 프로필/비밀번호 변경(현재 로직과 호환)
    first = request.data.get('first_name', '')
    last  = request.data.get('last_name', '')
    email = request.data.get('email', '')
    curpw = request.data.get('current_password', '')
    newpw = request.data.get('new_password', '')

    # 기본 정보 반영
    user.first_name = first
    user.last_name  = last
    user.email      = email
    user.save()

    message = "Profile updated"
    password_changed = False
    reload_flag = True  # 요구사항: 0~3은 리로드, 4(성공 변경)는 리로드 X

    # 비밀번호 분기
    if curpw or newpw:
        if curpw and not newpw:
            message = "To change your password, enter new password"
        elif (not curpw) or (not check_password(curpw, user.password)):
            message = "Enter correct current password"
        elif curpw == newpw:
            message = "New password should be different with current password"
        else:
            user.set_password(newpw)
            user.save()
            message = "Password successfully changed"
            password_changed = True
            reload_flag = False

    ser = ProfileSerializer(user, context={'request': request})
    return Response({
        "message": message,
        "password_changed": password_changed,
        "reload": reload_flag,
        "user": ser.data
    }, status=200)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_avatar_view(request):
    """
    POST multipart/form-data with field name 'avatar'
    """
    user = request.user
    avatar_file = request.FILES.get('avatar')
    if not avatar_file:
        return Response({"detail": "No file uploaded (field: avatar)."}, status=400)

    # 간단한 확장자/크기 체크(선택)
    if avatar_file.size > 5 * 1024 * 1024:  # 5MB 제한 예시
        return Response({"detail": "File too large (max 5MB)."}, status=400)

    user.avatar = avatar_file
    user.save()

    ser = ProfileSerializer(user, context={'request': request})
    return Response({
        "message": "Avatar updated",
        "avatar_url": ser.data.get('avatar_url', ''),
        "user": ser.data
    }, status=200)