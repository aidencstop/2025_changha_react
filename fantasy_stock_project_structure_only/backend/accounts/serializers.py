from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import CustomUser

# accounts/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "password",
            "confirm_password",
        )

    def validate(self, attrs):
        cp = attrs.pop("confirm_password", None)
        if cp is not None and attrs.get("password") != cp:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        user = User(
            username=validated_data.get("username"),
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            email=validated_data.get("email", ""),
        )
        user.set_password(validated_data.get("password"))
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(username=data['username'], password=data['password'])
        if user and user.is_active:
            return user
        raise serializers.ValidationError("Invalid username or password.")

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'username']

# accounts/serializers.py
from django.contrib.auth import password_validation, get_user_model
from rest_framework import serializers

User = get_user_model()

# accounts/serializers.py
from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()

class ProfileSerializer(serializers.Serializer):
    username   = serializers.CharField(read_only=True)
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name  = serializers.CharField(required=False, allow_blank=True)
    email      = serializers.EmailField(required=False, allow_blank=True)
    avatar_url = serializers.SerializerMethodField()   # ✅ 추가

    def get_avatar_url(self, obj: User):
        request = self.context.get("request")
        if getattr(obj, "avatar", None):
            try:
                url = obj.avatar.url
                # 절대 URL로 변환
                return request.build_absolute_uri(url) if request else url
            except Exception:
                return ""
        return ""

    def to_representation(self, instance: User):
        data = super().to_representation(instance)
        # 기존 구조 그대로 유지 + avatar_url 병합
        data.update({
            "username": getattr(instance, "username", ""),
            "first_name": getattr(instance, "first_name", ""),
            "last_name": getattr(instance, "last_name", ""),
            "email": getattr(instance, "email", ""),
            "avatar_url": self.get_avatar_url(instance),
        })
        return data

    def update(self, instance: User, validated_data):
        for f in ("first_name", "last_name", "email"):
            if f in validated_data and hasattr(instance, f):
                setattr(instance, f, validated_data[f])
        instance.save()
        return instance



