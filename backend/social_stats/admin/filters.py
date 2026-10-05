"""Unfold filters shared by the domain-specific admin registrations."""
from django.contrib.admin.utils import get_fields_from_path
from django.db import models
from unfold.contrib.filters.admin import (
    AutocompleteSelectFilter, BooleanRadioFilter, ChoicesDropdownFilter,
    DropdownFilter, RangeDateFilter, RangeDateTimeFilter,
)

from social_stats.platforms.registry import PLATFORM_REGISTRY


class PlatformCategoryFilter(DropdownFilter):
    title = 'دسته پلتفرم'
    parameter_name = 'platform_category'

    def lookups(self, request, model_admin):
        return {platform.category: platform.category_title_fa for platform in PLATFORM_REGISTRY}.items()

    def queryset(self, request, queryset):
        if not self.value():
            return queryset
        keys = [platform.key for platform in PLATFORM_REGISTRY if platform.category == self.value()]
        return queryset.filter(platform__in=keys)


def domain_filters(model, configured_filters):
    """Style existing filters without changing their lookups or custom behavior."""
    filters = []
    for configured in configured_filters:
        if not isinstance(configured, str):
            filters.append(configured)
            continue
        field = get_fields_from_path(model, configured)[-1]
        filter_type = None
        if isinstance(field, models.BooleanField):
            filter_type = BooleanRadioFilter
        elif field.choices:
            filter_type = ChoicesDropdownFilter
        elif isinstance(field, models.DateTimeField):
            filter_type = RangeDateTimeFilter
        elif isinstance(field, models.DateField):
            filter_type = RangeDateFilter
        filters.append((configured, filter_type) if filter_type else configured)
    if any(field.name == 'client' and isinstance(field, models.ForeignKey) for field in model._meta.fields):
        filters.insert(0, ('client', AutocompleteSelectFilter))
    return filters
