local nk = require("nakama");

local function match_create_func(context, payload)

    local limit = 1
    local authoritative = true
    local min_size = 0
    local max_size = 3
    local label = nil

    -- 이미 생성된 매치 리스트 가져오기
    local matches = nk.match_list(limit, authoritative, label, min_size, max_size)

    -- 이미 매치가 있다면 가장 사람 많은 매치 ID return
    if (#matches > 0) then
        table.sort(matches, function(a, b)
            return a.size > b.size
        end)
        return matches[1].match_id
    end

    local module_name = "module_a"
    local params = {
        ["label"] = "module_a"
    }

    local match_id = nk.match_create(module_name, params)
    return match_id
end

nk.register_rpc(match_create_func, "create_match_rpc")
