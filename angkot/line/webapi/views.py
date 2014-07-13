from django.http import HttpResponse
from django.shortcuts import get_object_or_404

from angkot.common.utils import gpolyencode, get_or_none
from angkot.common.decorators import wapi
from angkot.geo.utils import get_or_create_city
from angkot.geo.models import Province

from ..models import Line, Author

def _line_to_dict(item):
    pid, cid = None, None
    city, province = None, None
    if item.city is not None:
        cid = item.city.id
        pid = item.city.province.id
        city = item.city.name
        province = item.city.province.name

    return dict(id=item.id,
                type=item.type,
                number=item.number,
                name=item.name,
                mode=item.mode,
                pid=pid,
                cid=cid,
                city=city,
                province=province)

def _line_to_pair(item):
    return (item.id, _line_to_dict(item))

def _encode_path(path):
    if path is None:
        return None

    return gpolyencode.encode(path)

def _route_to_dict(item):
    return dict(id=item.id,
                name=item.name,
                locations=item.locations,
                ordering=item.ordering,
                path=_encode_path(item.path))

@wapi.endpoint
def line_list(req):
    limit = 500

    try:
        page = int(req.GET.get('page', 0))
        cid = int(req.GET.get('cid', 0))
        pid = int(req.GET.get('pid', 0))
    except ValueError:
        page = 0
        cid = 0
        pid = 0

    filters = {}
    if cid > 0:
        filters['city__pk'] = cid
    elif pid > 0:
        filters['city__province__pk'] = pid

    start = page * limit
    end = start + limit
    query = Line.objects.filter(enabled=True, **filters) \
                        .order_by('pk')
    data = query[start:end]
    total = len(query)

    lines = dict(map(_line_to_pair, data))
    return dict(lines=lines,
                page=page,
                count=len(lines),
                total=total)

@wapi.endpoint
def line_data(req, line_id):
    line_id = int(line_id)

    line = get_object_or_404(Line, pk=line_id)
    routes = line.route_set.filter(enabled=True)

    line = _line_to_dict(line)
    routes = dict(map(_route_to_dict, routes))

    return dict(id=line_id,
                line=line,
                routes=routes)


def _get_create_line_params(req):
    pid = req.POST.get('pid')
    city = req.POST.get('city')
    number = req.POST.get('number')
    type = req.POST.get('type')

    if None in [pid, city, number]:
        raise wapi.Fail(http_code=400, error_msg='Insufficient parameters')

    try:
        pid = int(pid)
    except ValueError:
        raise wapi.Fail(http_code=400, error_msg='Bad parameters')

    province = get_or_none(Province, pk=pid)
    if province is None:
        raise wapi.Fail(http_code=400, error_msg='Unknown province')

    return province, city, number, type

def _create_new_line(req):
    province, city_name, number, type = _get_create_line_params(req)
    city = get_or_create_city(province, city_name)

    print('user:', req.user)
    author = Author.objects.create_from_request(req)
    line = Line(type=type,
                number=number,
                city=city,
                author=author)
    line.enabled = True
    line.save()

    return _line_to_dict(line)

@wapi.endpoint
def line_index(req):
    if req.method != 'POST':
        return wapi.Fail(http_code=405)

    return _create_new_line(req)

