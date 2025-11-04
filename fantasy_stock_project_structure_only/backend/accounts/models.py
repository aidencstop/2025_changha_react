from django.contrib.auth.models import AbstractUser
from django.db import models


def user_avatar_path(instance, filename):
    # uploads/avatars/<username>/<original filename>
    return f"uploads/avatars/{instance.username}/{filename}"


class CustomUser(AbstractUser):
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=100000.00)
    total_profit = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    current_rank = models.IntegerField(default=0)
    avatar = models.ImageField(upload_to=user_avatar_path, blank=True, null=True)

    def __str__(self):
        return self.username
