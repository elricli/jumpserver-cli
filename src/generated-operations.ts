import type { ApiOperation } from "./openapi.js";

export const operations: ApiOperation[] = [
  {
    "method": "POST",
    "path": "/accounts/accounts/username-suggestions/",
    "basePath": "/api/v1",
    "operationId": "accounts_accounts_username_suggestions",
    "tag": "accounts_accounts",
    "summary": "accounts_accounts_username_suggestions",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/AccountDetail"
    }
  },
  {
    "method": "GET",
    "path": "/assets/assets/suggestions/",
    "basePath": "/api/v1",
    "operationId": "assets_assets_match",
    "tag": "assets_assets",
    "summary": "assets_assets_match",
    "queryParameters": [
      {
        "name": "id",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "name",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "address",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "is_active",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "type",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "category",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "platform",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "exclude_platform",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "domain",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "protocols",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "domain_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "ping_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "gather_facts_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "change_secret_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "push_account_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "verify_account_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "gather_accounts_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "search",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "order",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": []
  },
  {
    "method": "GET",
    "path": "/assets/categories/constraints/",
    "basePath": "/api/v1",
    "operationId": "assets_categories_constraints",
    "tag": "assets_categories",
    "summary": "assets_categories_constraints",
    "queryParameters": [
      {
        "name": "search",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "order",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": []
  },
  {
    "method": "GET",
    "path": "/assets/categories/",
    "basePath": "/api/v1",
    "operationId": "assets_categories_list",
    "tag": "assets_categories",
    "summary": "assets_categories_list",
    "queryParameters": [
      {
        "name": "search",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "order",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": []
  },
  {
    "method": "POST",
    "path": "/assets/categories/render-to-json/",
    "basePath": "/api/v1",
    "operationId": "assets_categories_render_to_json",
    "tag": "assets_categories",
    "summary": "assets_categories_render_to_json",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/Category"
    }
  },
  {
    "method": "GET",
    "path": "/assets/categories/types/",
    "basePath": "/api/v1",
    "operationId": "assets_categories_types",
    "tag": "assets_categories",
    "summary": "assets_categories_types",
    "queryParameters": [
      {
        "name": "search",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "order",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": []
  },
  {
    "method": "GET",
    "path": "/assets/clouds/suggestions/",
    "basePath": "/api/v1",
    "operationId": "assets_clouds_match",
    "tag": "assets_clouds",
    "summary": "assets_clouds_match",
    "queryParameters": [
      {
        "name": "id",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "name",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "address",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "is_active",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "type",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "category",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "platform",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "exclude_platform",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "domain",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "protocols",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "domain_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "ping_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "gather_facts_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "change_secret_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "push_account_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "verify_account_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "gather_accounts_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "search",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "order",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": []
  },
  {
    "method": "GET",
    "path": "/assets/customs/suggestions/",
    "basePath": "/api/v1",
    "operationId": "assets_customs_match",
    "tag": "assets_customs",
    "summary": "assets_customs_match",
    "queryParameters": [
      {
        "name": "id",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "name",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "address",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "is_active",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "type",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "category",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "platform",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "exclude_platform",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "domain",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "protocols",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "domain_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "ping_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "gather_facts_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "change_secret_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "push_account_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "verify_account_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "gather_accounts_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "search",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "order",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": []
  },
  {
    "method": "GET",
    "path": "/assets/databases/suggestions/",
    "basePath": "/api/v1",
    "operationId": "assets_databases_match",
    "tag": "assets_databases",
    "summary": "assets_databases_match",
    "queryParameters": [
      {
        "name": "id",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "name",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "address",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "is_active",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "type",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "category",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "platform",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "exclude_platform",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "domain",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "protocols",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "domain_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "ping_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "gather_facts_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "change_secret_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "push_account_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "verify_account_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "gather_accounts_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "search",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "order",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": []
  },
  {
    "method": "GET",
    "path": "/assets/devices/suggestions/",
    "basePath": "/api/v1",
    "operationId": "assets_devices_match",
    "tag": "assets_devices",
    "summary": "assets_devices_match",
    "queryParameters": [
      {
        "name": "id",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "name",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "address",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "is_active",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "type",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "category",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "platform",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "exclude_platform",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "domain",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "protocols",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "domain_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "ping_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "gather_facts_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "change_secret_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "push_account_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "verify_account_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "gather_accounts_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "search",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "order",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": []
  },
  {
    "method": "DELETE",
    "path": "/assets/favorite-assets/",
    "basePath": "/api/v1",
    "operationId": "assets_favorite-assets_bulk_delete",
    "tag": "assets_favorite-assets",
    "summary": "assets_favorite-assets_bulk_delete",
    "queryParameters": [],
    "pathParameters": []
  },
  {
    "method": "PUT",
    "path": "/assets/favorite-assets/",
    "basePath": "/api/v1",
    "operationId": "assets_favorite-assets_bulk_update",
    "tag": "assets_favorite-assets",
    "summary": "assets_favorite-assets_bulk_update",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/FavoriteAsset"
    }
  },
  {
    "method": "POST",
    "path": "/assets/favorite-assets/",
    "basePath": "/api/v1",
    "operationId": "assets_favorite-assets_create",
    "tag": "assets_favorite-assets",
    "summary": "assets_favorite-assets_create",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/FavoriteAsset"
    }
  },
  {
    "method": "DELETE",
    "path": "/assets/favorite-assets/{id}/",
    "basePath": "/api/v1",
    "operationId": "assets_favorite-assets_delete",
    "tag": "assets_favorite-assets",
    "summary": "assets_favorite-assets_delete",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ]
  },
  {
    "method": "GET",
    "path": "/assets/favorite-assets/",
    "basePath": "/api/v1",
    "operationId": "assets_favorite-assets_list",
    "tag": "assets_favorite-assets",
    "summary": "assets_favorite-assets_list",
    "queryParameters": [
      {
        "name": "asset",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "search",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "order",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": []
  },
  {
    "method": "PATCH",
    "path": "/assets/favorite-assets/",
    "basePath": "/api/v1",
    "operationId": "assets_favorite-assets_partial_bulk_update",
    "tag": "assets_favorite-assets",
    "summary": "assets_favorite-assets_partial_bulk_update",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/FavoriteAsset"
    }
  },
  {
    "method": "PATCH",
    "path": "/assets/favorite-assets/{id}/",
    "basePath": "/api/v1",
    "operationId": "assets_favorite-assets_partial_update",
    "tag": "assets_favorite-assets",
    "summary": "assets_favorite-assets_partial_update",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/FavoriteAsset"
    }
  },
  {
    "method": "GET",
    "path": "/assets/favorite-assets/{id}/",
    "basePath": "/api/v1",
    "operationId": "assets_favorite-assets_read",
    "tag": "assets_favorite-assets",
    "summary": "assets_favorite-assets_read",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ]
  },
  {
    "method": "PUT",
    "path": "/assets/favorite-assets/{id}/",
    "basePath": "/api/v1",
    "operationId": "assets_favorite-assets_update",
    "tag": "assets_favorite-assets",
    "summary": "assets_favorite-assets_update",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/FavoriteAsset"
    }
  },
  {
    "method": "GET",
    "path": "/assets/gateways/suggestions/",
    "basePath": "/api/v1",
    "operationId": "assets_gateways_match",
    "tag": "assets_gateways",
    "summary": "assets_gateways_match",
    "queryParameters": [
      {
        "name": "id",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "name",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "address",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "is_active",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "type",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "category",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "platform",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "exclude_platform",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "domain",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "protocols",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "domain_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "ping_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "gather_facts_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "change_secret_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "push_account_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "verify_account_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "gather_accounts_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "search",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "order",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": []
  },
  {
    "method": "GET",
    "path": "/assets/gpts/suggestions/",
    "basePath": "/api/v1",
    "operationId": "assets_gpts_match",
    "tag": "assets_gpts",
    "summary": "assets_gpts_match",
    "queryParameters": [
      {
        "name": "id",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "name",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "address",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "is_active",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "type",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "category",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "platform",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "exclude_platform",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "domain",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "protocols",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "domain_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "ping_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "gather_facts_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "change_secret_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "push_account_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "verify_account_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "gather_accounts_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "search",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "order",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": []
  },
  {
    "method": "GET",
    "path": "/assets/hosts/suggestions/",
    "basePath": "/api/v1",
    "operationId": "assets_hosts_match",
    "tag": "assets_hosts",
    "summary": "assets_hosts_match",
    "queryParameters": [
      {
        "name": "id",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "name",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "address",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "is_active",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "type",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "category",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "platform",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "exclude_platform",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "domain",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "protocols",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "domain_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "ping_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "gather_facts_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "change_secret_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "push_account_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "verify_account_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "gather_accounts_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "search",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "order",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": []
  },
  {
    "method": "GET",
    "path": "/assets/nodes/suggestions/",
    "basePath": "/api/v1",
    "operationId": "assets_nodes_match",
    "tag": "assets_nodes",
    "summary": "assets_nodes_match",
    "queryParameters": [
      {
        "name": "value",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "key",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "id",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "search",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "order",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": []
  },
  {
    "method": "GET",
    "path": "/assets/platform-automation-methods/",
    "basePath": "/api/v1",
    "operationId": "assets_platform-automation-methods_list",
    "tag": "assets_platform-automation-methods",
    "summary": "assets_platform-automation-methods_list",
    "queryParameters": [
      {
        "name": "search",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "order",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": []
  },
  {
    "method": "GET",
    "path": "/assets/protocols/",
    "basePath": "/api/v1",
    "operationId": "assets_protocols_list",
    "tag": "assets_protocols",
    "summary": "assets_protocols_list",
    "queryParameters": [
      {
        "name": "search",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "order",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": []
  },
  {
    "method": "GET",
    "path": "/assets/webs/suggestions/",
    "basePath": "/api/v1",
    "operationId": "assets_webs_match",
    "tag": "assets_webs",
    "summary": "assets_webs_match",
    "queryParameters": [
      {
        "name": "id",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "name",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "address",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "is_active",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "type",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "category",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "platform",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "exclude_platform",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "domain",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "protocols",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "domain_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "ping_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "gather_facts_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "change_secret_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "push_account_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "verify_account_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "gather_accounts_enabled",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "search",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "order",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": []
  },
  {
    "method": "GET",
    "path": "/audits/my-login-logs/",
    "basePath": "/api/v1",
    "operationId": "audits_my-login-logs_list",
    "tag": "audits_my-login-logs",
    "summary": "audits_my-login-logs_list",
    "queryParameters": [
      {
        "name": "id",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "username",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "ip",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "city",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "type",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "status",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "mfa",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "search",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "order",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": []
  },
  {
    "method": "GET",
    "path": "/audits/my-login-logs/{id}/",
    "basePath": "/api/v1",
    "operationId": "audits_my-login-logs_read",
    "tag": "audits_my-login-logs",
    "summary": "audits_my-login-logs_read",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ]
  },
  {
    "method": "POST",
    "path": "/authentication/access-keys/",
    "basePath": "/api/v1",
    "operationId": "authentication_access-keys_create",
    "tag": "authentication_access-keys",
    "summary": "authentication_access-keys_create",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/AccessKey"
    }
  },
  {
    "method": "DELETE",
    "path": "/authentication/access-keys/{id}/",
    "basePath": "/api/v1",
    "operationId": "authentication_access-keys_delete",
    "tag": "authentication_access-keys",
    "summary": "authentication_access-keys_delete",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ]
  },
  {
    "method": "GET",
    "path": "/authentication/access-keys/",
    "basePath": "/api/v1",
    "operationId": "authentication_access-keys_list",
    "tag": "authentication_access-keys",
    "summary": "authentication_access-keys_list",
    "queryParameters": [
      {
        "name": "search",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "order",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": []
  },
  {
    "method": "PATCH",
    "path": "/authentication/access-keys/{id}/",
    "basePath": "/api/v1",
    "operationId": "authentication_access-keys_partial_update",
    "tag": "authentication_access-keys",
    "summary": "authentication_access-keys_partial_update",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/AccessKey"
    }
  },
  {
    "method": "GET",
    "path": "/authentication/access-keys/{id}/",
    "basePath": "/api/v1",
    "operationId": "authentication_access-keys_read",
    "tag": "authentication_access-keys",
    "summary": "authentication_access-keys_read",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ]
  },
  {
    "method": "POST",
    "path": "/authentication/access-keys/render-to-json/",
    "basePath": "/api/v1",
    "operationId": "authentication_access-keys_render_to_json",
    "tag": "authentication_access-keys",
    "summary": "authentication_access-keys_render_to_json",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/AccessKey"
    }
  },
  {
    "method": "PUT",
    "path": "/authentication/access-keys/{id}/",
    "basePath": "/api/v1",
    "operationId": "authentication_access-keys_update",
    "tag": "authentication_access-keys",
    "summary": "authentication_access-keys_update",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/AccessKey"
    }
  },
  {
    "method": "POST",
    "path": "/authentication/auth/",
    "basePath": "/api/v1",
    "operationId": "authentication_auth_create",
    "tag": "authentication_auth",
    "summary": "authentication_auth_create",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/BearerToken"
    }
  },
  {
    "method": "GET",
    "path": "/authentication/confirm/check/",
    "basePath": "/api/v1",
    "operationId": "authentication_confirm_check",
    "tag": "authentication_confirm",
    "summary": "authentication_confirm_check",
    "queryParameters": [
      {
        "name": "search",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "order",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": []
  },
  {
    "method": "POST",
    "path": "/authentication/confirm/",
    "basePath": "/api/v1",
    "operationId": "authentication_confirm_create",
    "tag": "authentication_confirm",
    "summary": "authentication_confirm_create",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/Confirm"
    }
  },
  {
    "method": "GET",
    "path": "/authentication/confirm/",
    "basePath": "/api/v1",
    "operationId": "authentication_confirm_list",
    "tag": "authentication_confirm",
    "summary": "authentication_confirm_list",
    "queryParameters": [
      {
        "name": "search",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "order",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": []
  },
  {
    "method": "POST",
    "path": "/authentication/confirm/render-to-json/",
    "basePath": "/api/v1",
    "operationId": "authentication_confirm_render_to_json",
    "tag": "authentication_confirm",
    "summary": "authentication_confirm_render_to_json",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/Confirm"
    }
  },
  {
    "method": "POST",
    "path": "/authentication/connection-token/{id}/client-url/",
    "basePath": "/api/v1",
    "operationId": "authentication_connection-token_client-url_create",
    "tag": "authentication_connection-token",
    "summary": "authentication_connection-token_client-url_create",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/ConnectionToken"
    }
  },
  {
    "method": "GET",
    "path": "/authentication/connection-token/{id}/client-url/",
    "basePath": "/api/v1",
    "operationId": "authentication_connection-token_client-url_read",
    "tag": "authentication_connection-token",
    "summary": "authentication_connection-token_client-url_read",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ]
  },
  {
    "method": "POST",
    "path": "/authentication/connection-token/",
    "basePath": "/api/v1",
    "operationId": "authentication_connection-token_create",
    "tag": "authentication_connection-token",
    "summary": "authentication_connection-token_create",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/ConnectionToken"
    }
  },
  {
    "method": "POST",
    "path": "/authentication/connection-token/exchange/",
    "basePath": "/api/v1",
    "operationId": "authentication_connection-token_exchange",
    "tag": "authentication_connection-token",
    "summary": "authentication_connection-token_exchange",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/ConnectionToken"
    }
  },
  {
    "method": "PATCH",
    "path": "/authentication/connection-token/{id}/expire/",
    "basePath": "/api/v1",
    "operationId": "authentication_connection-token_expire",
    "tag": "authentication_connection-token",
    "summary": "authentication_connection-token_expire",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/ConnectionToken"
    }
  },
  {
    "method": "GET",
    "path": "/authentication/connection-token/",
    "basePath": "/api/v1",
    "operationId": "authentication_connection-token_list",
    "tag": "authentication_connection-token",
    "summary": "authentication_connection-token_list",
    "queryParameters": [
      {
        "name": "user_display",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "asset_display",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "search",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "order",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": []
  },
  {
    "method": "POST",
    "path": "/authentication/connection-token/{id}/rdp-file/",
    "basePath": "/api/v1",
    "operationId": "authentication_connection-token_rdp-file_create",
    "tag": "authentication_connection-token",
    "summary": "authentication_connection-token_rdp-file_create",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/ConnectionToken"
    }
  },
  {
    "method": "GET",
    "path": "/authentication/connection-token/{id}/rdp-file/",
    "basePath": "/api/v1",
    "operationId": "authentication_connection-token_rdp-file_read",
    "tag": "authentication_connection-token",
    "summary": "authentication_connection-token_rdp-file_read",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ]
  },
  {
    "method": "GET",
    "path": "/authentication/connection-token/{id}/",
    "basePath": "/api/v1",
    "operationId": "authentication_connection-token_read",
    "tag": "authentication_connection-token",
    "summary": "authentication_connection-token_read",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ]
  },
  {
    "method": "POST",
    "path": "/authentication/connection-token/render-to-json/",
    "basePath": "/api/v1",
    "operationId": "authentication_connection-token_render_to_json",
    "tag": "authentication_connection-token",
    "summary": "authentication_connection-token_render_to_json",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/ConnectionToken"
    }
  },
  {
    "method": "PATCH",
    "path": "/authentication/connection-token/{id}/reuse/",
    "basePath": "/api/v1",
    "operationId": "authentication_connection-token_reuse",
    "tag": "authentication_connection-token",
    "summary": "authentication_connection-token_reuse",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/ConnectionToken"
    }
  },
  {
    "method": "POST",
    "path": "/authentication/feishu/event/subscription/callback/",
    "basePath": "/api/v1",
    "operationId": "authentication_feishu_event_subscription_callback_create",
    "tag": "authentication_feishu",
    "summary": "authentication_feishu_event_subscription_callback_create",
    "queryParameters": [],
    "pathParameters": []
  },
  {
    "method": "POST",
    "path": "/authentication/lark/event/subscription/callback/",
    "basePath": "/api/v1",
    "operationId": "authentication_lark_event_subscription_callback_create",
    "tag": "authentication_lark",
    "summary": "authentication_lark_event_subscription_callback_create",
    "queryParameters": [],
    "pathParameters": []
  },
  {
    "method": "DELETE",
    "path": "/authentication/login-confirm-ticket/status/",
    "basePath": "/api/v1",
    "operationId": "authentication_login-confirm-ticket_status_delete",
    "tag": "authentication_login-confirm-ticket",
    "summary": "authentication_login-confirm-ticket_status_delete",
    "queryParameters": [],
    "pathParameters": []
  },
  {
    "method": "GET",
    "path": "/authentication/login-confirm-ticket/status/",
    "basePath": "/api/v1",
    "operationId": "authentication_login-confirm-ticket_status_list",
    "tag": "authentication_login-confirm-ticket",
    "summary": "authentication_login-confirm-ticket_status_list",
    "queryParameters": [],
    "pathParameters": []
  },
  {
    "method": "POST",
    "path": "/authentication/mfa/challenge/",
    "basePath": "/api/v1",
    "operationId": "authentication_mfa_challenge_create",
    "tag": "authentication_mfa",
    "summary": "authentication_mfa_challenge_create",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/MFAChallenge"
    }
  },
  {
    "method": "POST",
    "path": "/authentication/mfa/select/",
    "basePath": "/api/v1",
    "operationId": "authentication_mfa_select_create",
    "tag": "authentication_mfa",
    "summary": "authentication_mfa_select_create",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/MFASelectType"
    }
  },
  {
    "method": "POST",
    "path": "/authentication/mfa/send-code/",
    "basePath": "/api/v1",
    "operationId": "authentication_mfa_send-code_create",
    "tag": "authentication_mfa",
    "summary": "authentication_mfa_send-code_create",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/MFASelectType"
    }
  },
  {
    "method": "POST",
    "path": "/authentication/mfa/verify/",
    "basePath": "/api/v1",
    "operationId": "authentication_mfa_verify_create",
    "tag": "authentication_mfa",
    "summary": "authentication_mfa_verify_create",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/MFAChallenge"
    }
  },
  {
    "method": "POST",
    "path": "/authentication/passkeys/auth/",
    "basePath": "/api/v1",
    "operationId": "authentication_passkeys_auth_create",
    "tag": "authentication_passkeys",
    "summary": "authentication_passkeys_auth_create",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/Passkey"
    }
  },
  {
    "method": "GET",
    "path": "/authentication/passkeys/auth/",
    "basePath": "/api/v1",
    "operationId": "authentication_passkeys_auth_read",
    "tag": "authentication_passkeys",
    "summary": "authentication_passkeys_auth_read",
    "queryParameters": [
      {
        "name": "search",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "order",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": []
  },
  {
    "method": "POST",
    "path": "/authentication/passkeys/",
    "basePath": "/api/v1",
    "operationId": "authentication_passkeys_create",
    "tag": "authentication_passkeys",
    "summary": "authentication_passkeys_create",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/Passkey"
    }
  },
  {
    "method": "DELETE",
    "path": "/authentication/passkeys/{id}/",
    "basePath": "/api/v1",
    "operationId": "authentication_passkeys_delete",
    "tag": "authentication_passkeys",
    "summary": "authentication_passkeys_delete",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ]
  },
  {
    "method": "GET",
    "path": "/authentication/passkeys/",
    "basePath": "/api/v1",
    "operationId": "authentication_passkeys_list",
    "tag": "authentication_passkeys",
    "summary": "authentication_passkeys_list",
    "queryParameters": [
      {
        "name": "search",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "order",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": []
  },
  {
    "method": "GET",
    "path": "/authentication/passkeys/login/",
    "basePath": "/api/v1",
    "operationId": "authentication_passkeys_login",
    "tag": "authentication_passkeys",
    "summary": "authentication_passkeys_login",
    "queryParameters": [
      {
        "name": "search",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "order",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": []
  },
  {
    "method": "PATCH",
    "path": "/authentication/passkeys/{id}/",
    "basePath": "/api/v1",
    "operationId": "authentication_passkeys_partial_update",
    "tag": "authentication_passkeys",
    "summary": "authentication_passkeys_partial_update",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/Passkey"
    }
  },
  {
    "method": "GET",
    "path": "/authentication/passkeys/{id}/",
    "basePath": "/api/v1",
    "operationId": "authentication_passkeys_read",
    "tag": "authentication_passkeys",
    "summary": "authentication_passkeys_read",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ]
  },
  {
    "method": "POST",
    "path": "/authentication/passkeys/register/",
    "basePath": "/api/v1",
    "operationId": "authentication_passkeys_register_create",
    "tag": "authentication_passkeys",
    "summary": "authentication_passkeys_register_create",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/Passkey"
    }
  },
  {
    "method": "GET",
    "path": "/authentication/passkeys/register/",
    "basePath": "/api/v1",
    "operationId": "authentication_passkeys_register_read",
    "tag": "authentication_passkeys",
    "summary": "authentication_passkeys_register_read",
    "queryParameters": [
      {
        "name": "search",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "order",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": []
  },
  {
    "method": "POST",
    "path": "/authentication/passkeys/render-to-json/",
    "basePath": "/api/v1",
    "operationId": "authentication_passkeys_render_to_json",
    "tag": "authentication_passkeys",
    "summary": "authentication_passkeys_render_to_json",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/Passkey"
    }
  },
  {
    "method": "PUT",
    "path": "/authentication/passkeys/{id}/",
    "basePath": "/api/v1",
    "operationId": "authentication_passkeys_update",
    "tag": "authentication_passkeys",
    "summary": "authentication_passkeys_update",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/Passkey"
    }
  },
  {
    "method": "POST",
    "path": "/authentication/password/reset-code/",
    "basePath": "/api/v1",
    "operationId": "authentication_password_reset-code_create",
    "tag": "authentication_password",
    "summary": "authentication_password_reset-code_create",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/ResetPasswordCode"
    }
  },
  {
    "method": "POST",
    "path": "/authentication/password/verify/",
    "basePath": "/api/v1",
    "operationId": "authentication_password_verify_create",
    "tag": "authentication_password",
    "summary": "authentication_password_verify_create",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/PasswordVerify"
    }
  },
  {
    "method": "GET",
    "path": "/authentication/sso/login/",
    "basePath": "/api/v1",
    "operationId": "authentication_sso_login",
    "tag": "authentication_sso",
    "summary": "authentication_sso_login",
    "queryParameters": [
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": []
  },
  {
    "method": "GET",
    "path": "/authentication/super-connection-token/",
    "basePath": "/api/v1",
    "operationId": "authentication_super-connection-token_list",
    "tag": "authentication_super-connection-token",
    "summary": "authentication_super-connection-token_list",
    "queryParameters": [
      {
        "name": "user_display",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "asset_display",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "search",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "order",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": []
  },
  {
    "method": "GET",
    "path": "/authentication/super-connection-token/{id}/",
    "basePath": "/api/v1",
    "operationId": "authentication_super-connection-token_read",
    "tag": "authentication_super-connection-token",
    "summary": "authentication_super-connection-token_read",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ]
  },
  {
    "method": "POST",
    "path": "/authentication/super-connection-token/render-to-json/",
    "basePath": "/api/v1",
    "operationId": "authentication_super-connection-token_render_to_json",
    "tag": "authentication_super-connection-token",
    "summary": "authentication_super-connection-token_render_to_json",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/SuperConnectionToken"
    }
  },
  {
    "method": "POST",
    "path": "/authentication/temp-tokens/",
    "basePath": "/api/v1",
    "operationId": "authentication_temp-tokens_create",
    "tag": "authentication_temp-tokens",
    "summary": "authentication_temp-tokens_create",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/TempToken"
    }
  },
  {
    "method": "PATCH",
    "path": "/authentication/temp-tokens/{id}/expire/",
    "basePath": "/api/v1",
    "operationId": "authentication_temp-tokens_expire",
    "tag": "authentication_temp-tokens",
    "summary": "authentication_temp-tokens_expire",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/TempToken"
    }
  },
  {
    "method": "GET",
    "path": "/authentication/temp-tokens/",
    "basePath": "/api/v1",
    "operationId": "authentication_temp-tokens_list",
    "tag": "authentication_temp-tokens",
    "summary": "authentication_temp-tokens_list",
    "queryParameters": [
      {
        "name": "search",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "order",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": []
  },
  {
    "method": "PATCH",
    "path": "/authentication/temp-tokens/{id}/",
    "basePath": "/api/v1",
    "operationId": "authentication_temp-tokens_partial_update",
    "tag": "authentication_temp-tokens",
    "summary": "authentication_temp-tokens_partial_update",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/TempToken"
    }
  },
  {
    "method": "GET",
    "path": "/authentication/temp-tokens/{id}/",
    "basePath": "/api/v1",
    "operationId": "authentication_temp-tokens_read",
    "tag": "authentication_temp-tokens",
    "summary": "authentication_temp-tokens_read",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ]
  },
  {
    "method": "POST",
    "path": "/authentication/temp-tokens/render-to-json/",
    "basePath": "/api/v1",
    "operationId": "authentication_temp-tokens_render_to_json",
    "tag": "authentication_temp-tokens",
    "summary": "authentication_temp-tokens_render_to_json",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/TempToken"
    }
  },
  {
    "method": "POST",
    "path": "/authentication/tokens/",
    "basePath": "/api/v1",
    "operationId": "authentication_tokens_create",
    "tag": "authentication_tokens",
    "summary": "authentication_tokens_create",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/BearerToken"
    }
  },
  {
    "method": "DELETE",
    "path": "/authentication/user-session/",
    "basePath": "/api/v1",
    "operationId": "authentication_user-session_delete",
    "tag": "authentication_user-session",
    "summary": "authentication_user-session_delete",
    "queryParameters": [],
    "pathParameters": []
  },
  {
    "method": "GET",
    "path": "/authentication/user-session/",
    "basePath": "/api/v1",
    "operationId": "authentication_user-session_read",
    "tag": "authentication_user-session",
    "summary": "authentication_user-session_read",
    "queryParameters": [],
    "pathParameters": []
  },
  {
    "method": "POST",
    "path": "/common/resources/cache/",
    "basePath": "/api/v1",
    "operationId": "common_resources_cache_create",
    "tag": "common_resources",
    "summary": "common_resources_cache_create",
    "queryParameters": [],
    "pathParameters": []
  },
  {
    "method": "GET",
    "path": "/notifications/backends/",
    "basePath": "/api/v1",
    "operationId": "notifications_backends_list",
    "tag": "notifications_backends",
    "summary": "notifications_backends_list",
    "queryParameters": [],
    "pathParameters": []
  },
  {
    "method": "GET",
    "path": "/notifications/site-messages/",
    "basePath": "/api/v1",
    "operationId": "notifications_site-messages_list",
    "tag": "notifications_site-messages",
    "summary": "notifications_site-messages_list",
    "queryParameters": [
      {
        "name": "has_read",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "search",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "order",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": []
  },
  {
    "method": "PATCH",
    "path": "/notifications/site-messages/mark-as-read/",
    "basePath": "/api/v1",
    "operationId": "notifications_site-messages_mark_as_read",
    "tag": "notifications_site-messages",
    "summary": "notifications_site-messages_mark_as_read",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/SiteMessage"
    }
  },
  {
    "method": "PATCH",
    "path": "/notifications/site-messages/mark-as-read-all/",
    "basePath": "/api/v1",
    "operationId": "notifications_site-messages_mark_as_read_all",
    "tag": "notifications_site-messages",
    "summary": "notifications_site-messages_mark_as_read_all",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/SiteMessage"
    }
  },
  {
    "method": "GET",
    "path": "/notifications/site-messages/{id}/",
    "basePath": "/api/v1",
    "operationId": "notifications_site-messages_read",
    "tag": "notifications_site-messages",
    "summary": "notifications_site-messages_read",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ]
  },
  {
    "method": "POST",
    "path": "/notifications/site-messages/render-to-json/",
    "basePath": "/api/v1",
    "operationId": "notifications_site-messages_render_to_json",
    "tag": "notifications_site-messages",
    "summary": "notifications_site-messages_render_to_json",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/SiteMessage"
    }
  },
  {
    "method": "POST",
    "path": "/notifications/site-messages/send/",
    "basePath": "/api/v1",
    "operationId": "notifications_site-messages_send",
    "tag": "notifications_site-messages",
    "summary": "notifications_site-messages_send",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/SiteMessage"
    }
  },
  {
    "method": "GET",
    "path": "/notifications/site-messages/unread-total/",
    "basePath": "/api/v1",
    "operationId": "notifications_site-messages_unread_total",
    "tag": "notifications_site-messages",
    "summary": "notifications_site-messages_unread_total",
    "queryParameters": [
      {
        "name": "has_read",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "search",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "order",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": []
  },
  {
    "method": "GET",
    "path": "/notifications/user-msg-subscription/",
    "basePath": "/api/v1",
    "operationId": "notifications_user-msg-subscription_list",
    "tag": "notifications_user-msg-subscription",
    "summary": "notifications_user-msg-subscription_list",
    "queryParameters": [
      {
        "name": "search",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "order",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": []
  },
  {
    "method": "PATCH",
    "path": "/notifications/user-msg-subscription/{user_id}/",
    "basePath": "/api/v1",
    "operationId": "notifications_user-msg-subscription_partial_update",
    "tag": "notifications_user-msg-subscription",
    "summary": "notifications_user-msg-subscription_partial_update",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "user_id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/UserMsgSubscription"
    }
  },
  {
    "method": "GET",
    "path": "/notifications/user-msg-subscription/{user_id}/",
    "basePath": "/api/v1",
    "operationId": "notifications_user-msg-subscription_read",
    "tag": "notifications_user-msg-subscription",
    "summary": "notifications_user-msg-subscription_read",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "user_id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ]
  },
  {
    "method": "POST",
    "path": "/notifications/user-msg-subscription/render-to-json/",
    "basePath": "/api/v1",
    "operationId": "notifications_user-msg-subscription_render_to_json",
    "tag": "notifications_user-msg-subscription",
    "summary": "notifications_user-msg-subscription_render_to_json",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/UserMsgSubscription"
    }
  },
  {
    "method": "PUT",
    "path": "/notifications/user-msg-subscription/{user_id}/",
    "basePath": "/api/v1",
    "operationId": "notifications_user-msg-subscription_update",
    "tag": "notifications_user-msg-subscription",
    "summary": "notifications_user-msg-subscription_update",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "user_id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/UserMsgSubscription"
    }
  },
  {
    "method": "DELETE",
    "path": "/ops/adhocs/",
    "basePath": "/api/v1",
    "operationId": "ops_adhocs_bulk_delete",
    "tag": "ops_adhocs",
    "summary": "ops_adhocs_bulk_delete",
    "queryParameters": [],
    "pathParameters": []
  },
  {
    "method": "PUT",
    "path": "/ops/adhocs/",
    "basePath": "/api/v1",
    "operationId": "ops_adhocs_bulk_update",
    "tag": "ops_adhocs",
    "summary": "ops_adhocs_bulk_update",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/AdHoc"
    }
  },
  {
    "method": "POST",
    "path": "/ops/adhocs/",
    "basePath": "/api/v1",
    "operationId": "ops_adhocs_create",
    "tag": "ops_adhocs",
    "summary": "ops_adhocs_create",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/AdHoc"
    }
  },
  {
    "method": "DELETE",
    "path": "/ops/adhocs/{id}/",
    "basePath": "/api/v1",
    "operationId": "ops_adhocs_delete",
    "tag": "ops_adhocs",
    "summary": "ops_adhocs_delete",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ]
  },
  {
    "method": "GET",
    "path": "/ops/adhocs/",
    "basePath": "/api/v1",
    "operationId": "ops_adhocs_list",
    "tag": "ops_adhocs",
    "summary": "ops_adhocs_list",
    "queryParameters": [
      {
        "name": "search",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "order",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": []
  },
  {
    "method": "PATCH",
    "path": "/ops/adhocs/",
    "basePath": "/api/v1",
    "operationId": "ops_adhocs_partial_bulk_update",
    "tag": "ops_adhocs",
    "summary": "ops_adhocs_partial_bulk_update",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/AdHoc"
    }
  },
  {
    "method": "PATCH",
    "path": "/ops/adhocs/{id}/",
    "basePath": "/api/v1",
    "operationId": "ops_adhocs_partial_update",
    "tag": "ops_adhocs",
    "summary": "ops_adhocs_partial_update",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/AdHoc"
    }
  },
  {
    "method": "GET",
    "path": "/ops/adhocs/{id}/",
    "basePath": "/api/v1",
    "operationId": "ops_adhocs_read",
    "tag": "ops_adhocs",
    "summary": "ops_adhocs_read",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ]
  },
  {
    "method": "POST",
    "path": "/ops/adhocs/render-to-json/",
    "basePath": "/api/v1",
    "operationId": "ops_adhocs_render_to_json",
    "tag": "ops_adhocs",
    "summary": "ops_adhocs_render_to_json",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/AdHoc"
    }
  },
  {
    "method": "PUT",
    "path": "/ops/adhocs/{id}/",
    "basePath": "/api/v1",
    "operationId": "ops_adhocs_update",
    "tag": "ops_adhocs",
    "summary": "ops_adhocs_update",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/AdHoc"
    }
  },
  {
    "method": "GET",
    "path": "/ops/ansible/job-execution/{id}/log/",
    "basePath": "/api/v1",
    "operationId": "ops_ansible_job-execution_log_read",
    "tag": "ops_ansible",
    "summary": "ops_ansible_job-execution_log_read",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ]
  },
  {
    "method": "GET",
    "path": "/ops/celery/task/{name}/task-execution/{id}/log/",
    "basePath": "/api/v1",
    "operationId": "ops_celery_task_task-execution_log_read",
    "tag": "ops_celery",
    "summary": "ops_celery_task_task-execution_log_read",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "name",
        "required": true,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ]
  },
  {
    "method": "GET",
    "path": "/ops/celery/task/{name}/task-execution/{id}/result/",
    "basePath": "/api/v1",
    "operationId": "ops_celery_task_task-execution_result_read",
    "tag": "ops_celery",
    "summary": "ops_celery_task_task-execution_result_read",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "name",
        "required": true,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ]
  },
  {
    "method": "GET",
    "path": "/ops/job-execution/task-detail/{task_id}/",
    "basePath": "/api/v1",
    "operationId": "ops_job-execution_task-detail_read",
    "tag": "ops_job-execution",
    "summary": "ops_job-execution_task-detail_read",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "task_id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ]
  },
  {
    "method": "POST",
    "path": "/ops/job-executions/",
    "basePath": "/api/v1",
    "operationId": "ops_job-executions_create",
    "tag": "ops_job-executions",
    "summary": "ops_job-executions_create",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/JobExecution"
    }
  },
  {
    "method": "GET",
    "path": "/ops/job-executions/",
    "basePath": "/api/v1",
    "operationId": "ops_job-executions_list",
    "tag": "ops_job-executions",
    "summary": "ops_job-executions_list",
    "queryParameters": [
      {
        "name": "status",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "job_id",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "search",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "order",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": []
  },
  {
    "method": "GET",
    "path": "/ops/job-executions/{id}/",
    "basePath": "/api/v1",
    "operationId": "ops_job-executions_read",
    "tag": "ops_job-executions",
    "summary": "ops_job-executions_read",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ]
  },
  {
    "method": "POST",
    "path": "/ops/job-executions/render-to-json/",
    "basePath": "/api/v1",
    "operationId": "ops_job-executions_render_to_json",
    "tag": "ops_job-executions",
    "summary": "ops_job-executions_render_to_json",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/JobExecution"
    }
  },
  {
    "method": "POST",
    "path": "/ops/job-executions/stop/",
    "basePath": "/api/v1",
    "operationId": "ops_job-executions_stop",
    "tag": "ops_job-executions",
    "summary": "ops_job-executions_stop",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/JobTaskStopSerializer"
    }
  },
  {
    "method": "POST",
    "path": "/ops/jobs/upload/",
    "basePath": "/api/v1",
    "operationId": "ops_jobs_upload",
    "tag": "ops_jobs",
    "summary": "ops_jobs_upload",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/JobFileSerializer"
    }
  },
  {
    "method": "POST",
    "path": "/ops/playbook/{id}/file/",
    "basePath": "/api/v1",
    "operationId": "ops_playbook_file_create",
    "tag": "ops_playbook",
    "summary": "ops_playbook_file_create",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ]
  },
  {
    "method": "DELETE",
    "path": "/ops/playbook/{id}/file/",
    "basePath": "/api/v1",
    "operationId": "ops_playbook_file_delete",
    "tag": "ops_playbook",
    "summary": "ops_playbook_file_delete",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ]
  },
  {
    "method": "GET",
    "path": "/ops/playbook/{id}/file/",
    "basePath": "/api/v1",
    "operationId": "ops_playbook_file_list",
    "tag": "ops_playbook",
    "summary": "ops_playbook_file_list",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ]
  },
  {
    "method": "PATCH",
    "path": "/ops/playbook/{id}/file/",
    "basePath": "/api/v1",
    "operationId": "ops_playbook_file_partial_update",
    "tag": "ops_playbook",
    "summary": "ops_playbook_file_partial_update",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ]
  },
  {
    "method": "DELETE",
    "path": "/ops/playbooks/",
    "basePath": "/api/v1",
    "operationId": "ops_playbooks_bulk_delete",
    "tag": "ops_playbooks",
    "summary": "ops_playbooks_bulk_delete",
    "queryParameters": [],
    "pathParameters": []
  },
  {
    "method": "PUT",
    "path": "/ops/playbooks/",
    "basePath": "/api/v1",
    "operationId": "ops_playbooks_bulk_update",
    "tag": "ops_playbooks",
    "summary": "ops_playbooks_bulk_update",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/Playbook"
    }
  },
  {
    "method": "POST",
    "path": "/ops/playbooks/",
    "basePath": "/api/v1",
    "operationId": "ops_playbooks_create",
    "tag": "ops_playbooks",
    "summary": "ops_playbooks_create",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/Playbook"
    }
  },
  {
    "method": "DELETE",
    "path": "/ops/playbooks/{id}/",
    "basePath": "/api/v1",
    "operationId": "ops_playbooks_delete",
    "tag": "ops_playbooks",
    "summary": "ops_playbooks_delete",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ]
  },
  {
    "method": "GET",
    "path": "/ops/playbooks/",
    "basePath": "/api/v1",
    "operationId": "ops_playbooks_list",
    "tag": "ops_playbooks",
    "summary": "ops_playbooks_list",
    "queryParameters": [
      {
        "name": "search",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "order",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": []
  },
  {
    "method": "PATCH",
    "path": "/ops/playbooks/",
    "basePath": "/api/v1",
    "operationId": "ops_playbooks_partial_bulk_update",
    "tag": "ops_playbooks",
    "summary": "ops_playbooks_partial_bulk_update",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/Playbook"
    }
  },
  {
    "method": "PATCH",
    "path": "/ops/playbooks/{id}/",
    "basePath": "/api/v1",
    "operationId": "ops_playbooks_partial_update",
    "tag": "ops_playbooks",
    "summary": "ops_playbooks_partial_update",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/Playbook"
    }
  },
  {
    "method": "GET",
    "path": "/ops/playbooks/{id}/",
    "basePath": "/api/v1",
    "operationId": "ops_playbooks_read",
    "tag": "ops_playbooks",
    "summary": "ops_playbooks_read",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ]
  },
  {
    "method": "POST",
    "path": "/ops/playbooks/render-to-json/",
    "basePath": "/api/v1",
    "operationId": "ops_playbooks_render_to_json",
    "tag": "ops_playbooks",
    "summary": "ops_playbooks_render_to_json",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/Playbook"
    }
  },
  {
    "method": "PUT",
    "path": "/ops/playbooks/{id}/",
    "basePath": "/api/v1",
    "operationId": "ops_playbooks_update",
    "tag": "ops_playbooks",
    "summary": "ops_playbooks_update",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/Playbook"
    }
  },
  {
    "method": "GET",
    "path": "/ops/task-executions/",
    "basePath": "/api/v1",
    "operationId": "ops_task-executions_list",
    "tag": "ops_task-executions",
    "summary": "ops_task-executions_list",
    "queryParameters": [
      {
        "name": "search",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "order",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": []
  },
  {
    "method": "GET",
    "path": "/ops/task-executions/{id}/",
    "basePath": "/api/v1",
    "operationId": "ops_task-executions_read",
    "tag": "ops_task-executions",
    "summary": "ops_task-executions_read",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ]
  },
  {
    "method": "POST",
    "path": "/ops/username-hints/",
    "basePath": "/api/v1",
    "operationId": "ops_username-hints_create",
    "tag": "ops_username-hints",
    "summary": "ops_username-hints_create",
    "queryParameters": [],
    "pathParameters": []
  },
  {
    "method": "GET",
    "path": "/ops/variables/help/",
    "basePath": "/api/v1",
    "operationId": "ops_variables_help_list",
    "tag": "ops_variables",
    "summary": "ops_variables_help_list",
    "queryParameters": [],
    "pathParameters": []
  },
  {
    "method": "GET",
    "path": "/orgs/orgs/current/",
    "basePath": "/api/v1",
    "operationId": "orgs_orgs_current_read",
    "tag": "orgs_orgs",
    "summary": "orgs_orgs_current_read",
    "queryParameters": [],
    "pathParameters": []
  },
  {
    "method": "GET",
    "path": "/prometheus/metrics/",
    "basePath": "/api/v1",
    "operationId": "prometheus_metrics_list",
    "tag": "prometheus_metrics",
    "summary": "prometheus_metrics_list",
    "queryParameters": [],
    "pathParameters": []
  },
  {
    "method": "GET",
    "path": "/settings/chatai-prompts/",
    "basePath": "/api/v1",
    "operationId": "settings_chatai-prompts_list",
    "tag": "settings_chatai-prompts",
    "summary": "settings_chatai-prompts_list",
    "queryParameters": [
      {
        "name": "name",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "search",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "order",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": []
  },
  {
    "method": "GET",
    "path": "/settings/chatai-prompts/{id}/",
    "basePath": "/api/v1",
    "operationId": "settings_chatai-prompts_read",
    "tag": "settings_chatai-prompts",
    "summary": "settings_chatai-prompts_read",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ]
  },
  {
    "method": "GET",
    "path": "/settings/logo/",
    "basePath": "/api/v1",
    "operationId": "settings_logo_list",
    "tag": "settings_logo",
    "summary": "settings_logo_list",
    "queryParameters": [],
    "pathParameters": []
  },
  {
    "method": "GET",
    "path": "/settings/public/open/",
    "basePath": "/api/v1",
    "operationId": "settings_public_open_read",
    "tag": "settings_public",
    "summary": "settings_public_open_read",
    "queryParameters": [],
    "pathParameters": []
  },
  {
    "method": "GET",
    "path": "/settings/public/",
    "basePath": "/api/v1",
    "operationId": "settings_public_read",
    "tag": "settings_public",
    "summary": "settings_public_read",
    "queryParameters": [],
    "pathParameters": []
  },
  {
    "method": "GET",
    "path": "/settings/server-info/",
    "basePath": "/api/v1",
    "operationId": "settings_server-info_read",
    "tag": "settings_server-info",
    "summary": "settings_server-info_read",
    "queryParameters": [],
    "pathParameters": []
  },
  {
    "method": "GET",
    "path": "/terminal/components/connect-methods/",
    "basePath": "/api/v1",
    "operationId": "terminal_components_connect-methods_list",
    "tag": "terminal_components",
    "summary": "terminal_components_connect-methods_list",
    "queryParameters": [
      {
        "name": "search",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "order",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": []
  },
  {
    "method": "GET",
    "path": "/terminal/endpoints/smart/",
    "basePath": "/api/v1",
    "operationId": "terminal_endpoints_smart",
    "tag": "terminal_endpoints",
    "summary": "terminal_endpoints_smart",
    "queryParameters": [
      {
        "name": "name",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "host",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "search",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "order",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": []
  },
  {
    "method": "GET",
    "path": "/terminal/my-sessions/",
    "basePath": "/api/v1",
    "operationId": "terminal_my-sessions_list",
    "tag": "terminal_my-sessions",
    "summary": "terminal_my-sessions_list",
    "queryParameters": [
      {
        "name": "search",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "order",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": []
  },
  {
    "method": "GET",
    "path": "/terminal/sessions/online-info/",
    "basePath": "/api/v1",
    "operationId": "terminal_sessions_online_info",
    "tag": "terminal_sessions",
    "summary": "terminal_sessions_online_info",
    "queryParameters": [
      {
        "name": "user",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "user_id",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "asset",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "asset_id",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "account",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "remote_addr",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "protocol",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "is_finished",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "login_from",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "terminal",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "search",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "order",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": []
  },
  {
    "method": "GET",
    "path": "/terminal/sessions/{id}/",
    "basePath": "/api/v1",
    "operationId": "terminal_sessions_read",
    "tag": "terminal_sessions",
    "summary": "terminal_sessions_read",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ]
  },
  {
    "method": "POST",
    "path": "/terminal/tasks/toggle-lock-session-for-ticket/",
    "basePath": "/api/v1",
    "operationId": "terminal_tasks_handle_ticket_task",
    "tag": "terminal_tasks",
    "summary": "terminal_tasks_handle_ticket_task",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/TerminalTaskSerializer"
    }
  },
  {
    "method": "POST",
    "path": "/terminal/tasks/kill-session-for-ticket/",
    "basePath": "/api/v1",
    "operationId": "terminal_tasks_kill-session-for-ticket_create",
    "tag": "terminal_tasks",
    "summary": "terminal_tasks_kill-session-for-ticket_create",
    "queryParameters": [],
    "pathParameters": []
  },
  {
    "method": "GET",
    "path": "/terminal/terminals/{var}sessions/online-info/",
    "basePath": "/api/v1",
    "operationId": "terminal_terminals_online_info",
    "tag": "terminal_terminals",
    "summary": "terminal_terminals_online_info",
    "queryParameters": [
      {
        "name": "user",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "user_id",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "asset",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "asset_id",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "account",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "remote_addr",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "protocol",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "is_finished",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "login_from",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "terminal",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "search",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "order",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": [
      {
        "name": "var",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ]
  },
  {
    "method": "GET",
    "path": "/terminal/terminals/{var}sessions/{id}/",
    "basePath": "/api/v1",
    "operationId": "terminal_terminals_read",
    "tag": "terminal_terminals",
    "summary": "terminal_terminals_read",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "var",
        "required": true,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ]
  },
  {
    "method": "PATCH",
    "path": "/tickets/apply-asset-tickets/{id}/approve/",
    "basePath": "/api/v1",
    "operationId": "tickets_apply-asset-tickets_approve_partial_update",
    "tag": "tickets_apply-asset-tickets",
    "summary": "tickets_apply-asset-tickets_approve_partial_update",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/ApplyAsset"
    }
  },
  {
    "method": "PUT",
    "path": "/tickets/apply-asset-tickets/{id}/approve/",
    "basePath": "/api/v1",
    "operationId": "tickets_apply-asset-tickets_approve_update",
    "tag": "tickets_apply-asset-tickets",
    "summary": "tickets_apply-asset-tickets_approve_update",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/ApplyAsset"
    }
  },
  {
    "method": "PUT",
    "path": "/tickets/apply-asset-tickets/bulk/",
    "basePath": "/api/v1",
    "operationId": "tickets_apply-asset-tickets_bulk",
    "tag": "tickets_apply-asset-tickets",
    "summary": "tickets_apply-asset-tickets_bulk",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/ApplyAsset"
    }
  },
  {
    "method": "PUT",
    "path": "/tickets/apply-asset-tickets/{id}/close/",
    "basePath": "/api/v1",
    "operationId": "tickets_apply-asset-tickets_close",
    "tag": "tickets_apply-asset-tickets",
    "summary": "tickets_apply-asset-tickets_close",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/ApplyAsset"
    }
  },
  {
    "method": "GET",
    "path": "/tickets/apply-asset-tickets/",
    "basePath": "/api/v1",
    "operationId": "tickets_apply-asset-tickets_list",
    "tag": "tickets_apply-asset-tickets",
    "summary": "tickets_apply-asset-tickets_list",
    "queryParameters": [
      {
        "name": "id",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "search",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "order",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": []
  },
  {
    "method": "POST",
    "path": "/tickets/apply-asset-tickets/open/",
    "basePath": "/api/v1",
    "operationId": "tickets_apply-asset-tickets_open",
    "tag": "tickets_apply-asset-tickets",
    "summary": "tickets_apply-asset-tickets_open",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/ApplyAsset"
    }
  },
  {
    "method": "GET",
    "path": "/tickets/apply-asset-tickets/{id}/",
    "basePath": "/api/v1",
    "operationId": "tickets_apply-asset-tickets_read",
    "tag": "tickets_apply-asset-tickets",
    "summary": "tickets_apply-asset-tickets_read",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ]
  },
  {
    "method": "PUT",
    "path": "/tickets/apply-asset-tickets/{id}/reject/",
    "basePath": "/api/v1",
    "operationId": "tickets_apply-asset-tickets_reject",
    "tag": "tickets_apply-asset-tickets",
    "summary": "tickets_apply-asset-tickets_reject",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/ApplyAsset"
    }
  },
  {
    "method": "GET",
    "path": "/tickets/apply-assets/suggestions/",
    "basePath": "/api/v1",
    "operationId": "tickets_apply-assets_match",
    "tag": "tickets_apply-assets",
    "summary": "tickets_apply-assets_match",
    "queryParameters": [
      {
        "name": "search",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "order",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": []
  },
  {
    "method": "PATCH",
    "path": "/tickets/apply-command-tickets/{id}/approve/",
    "basePath": "/api/v1",
    "operationId": "tickets_apply-command-tickets_approve_partial_update",
    "tag": "tickets_apply-command-tickets",
    "summary": "tickets_apply-command-tickets_approve_partial_update",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/ApplyCommandReview"
    }
  },
  {
    "method": "PUT",
    "path": "/tickets/apply-command-tickets/{id}/approve/",
    "basePath": "/api/v1",
    "operationId": "tickets_apply-command-tickets_approve_update",
    "tag": "tickets_apply-command-tickets",
    "summary": "tickets_apply-command-tickets_approve_update",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/ApplyCommandReview"
    }
  },
  {
    "method": "PUT",
    "path": "/tickets/apply-command-tickets/bulk/",
    "basePath": "/api/v1",
    "operationId": "tickets_apply-command-tickets_bulk",
    "tag": "tickets_apply-command-tickets",
    "summary": "tickets_apply-command-tickets_bulk",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/ApplyCommandReview"
    }
  },
  {
    "method": "PUT",
    "path": "/tickets/apply-command-tickets/{id}/close/",
    "basePath": "/api/v1",
    "operationId": "tickets_apply-command-tickets_close",
    "tag": "tickets_apply-command-tickets",
    "summary": "tickets_apply-command-tickets_close",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/ApplyCommandReview"
    }
  },
  {
    "method": "GET",
    "path": "/tickets/apply-command-tickets/",
    "basePath": "/api/v1",
    "operationId": "tickets_apply-command-tickets_list",
    "tag": "tickets_apply-command-tickets",
    "summary": "tickets_apply-command-tickets_list",
    "queryParameters": [
      {
        "name": "id",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "search",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "order",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": []
  },
  {
    "method": "POST",
    "path": "/tickets/apply-command-tickets/open/",
    "basePath": "/api/v1",
    "operationId": "tickets_apply-command-tickets_open",
    "tag": "tickets_apply-command-tickets",
    "summary": "tickets_apply-command-tickets_open",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/ApplyCommandReview"
    }
  },
  {
    "method": "GET",
    "path": "/tickets/apply-command-tickets/{id}/",
    "basePath": "/api/v1",
    "operationId": "tickets_apply-command-tickets_read",
    "tag": "tickets_apply-command-tickets",
    "summary": "tickets_apply-command-tickets_read",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ]
  },
  {
    "method": "PUT",
    "path": "/tickets/apply-command-tickets/{id}/reject/",
    "basePath": "/api/v1",
    "operationId": "tickets_apply-command-tickets_reject",
    "tag": "tickets_apply-command-tickets",
    "summary": "tickets_apply-command-tickets_reject",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/ApplyCommandReview"
    }
  },
  {
    "method": "PATCH",
    "path": "/tickets/apply-login-asset-tickets/{id}/approve/",
    "basePath": "/api/v1",
    "operationId": "tickets_apply-login-asset-tickets_approve_partial_update",
    "tag": "tickets_apply-login-asset-tickets",
    "summary": "tickets_apply-login-asset-tickets_approve_partial_update",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/LoginAssetReview"
    }
  },
  {
    "method": "PUT",
    "path": "/tickets/apply-login-asset-tickets/{id}/approve/",
    "basePath": "/api/v1",
    "operationId": "tickets_apply-login-asset-tickets_approve_update",
    "tag": "tickets_apply-login-asset-tickets",
    "summary": "tickets_apply-login-asset-tickets_approve_update",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/LoginAssetReview"
    }
  },
  {
    "method": "PUT",
    "path": "/tickets/apply-login-asset-tickets/bulk/",
    "basePath": "/api/v1",
    "operationId": "tickets_apply-login-asset-tickets_bulk",
    "tag": "tickets_apply-login-asset-tickets",
    "summary": "tickets_apply-login-asset-tickets_bulk",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/LoginAssetReview"
    }
  },
  {
    "method": "PUT",
    "path": "/tickets/apply-login-asset-tickets/{id}/close/",
    "basePath": "/api/v1",
    "operationId": "tickets_apply-login-asset-tickets_close",
    "tag": "tickets_apply-login-asset-tickets",
    "summary": "tickets_apply-login-asset-tickets_close",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/LoginAssetReview"
    }
  },
  {
    "method": "GET",
    "path": "/tickets/apply-login-asset-tickets/",
    "basePath": "/api/v1",
    "operationId": "tickets_apply-login-asset-tickets_list",
    "tag": "tickets_apply-login-asset-tickets",
    "summary": "tickets_apply-login-asset-tickets_list",
    "queryParameters": [
      {
        "name": "id",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "search",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "order",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": []
  },
  {
    "method": "POST",
    "path": "/tickets/apply-login-asset-tickets/open/",
    "basePath": "/api/v1",
    "operationId": "tickets_apply-login-asset-tickets_open",
    "tag": "tickets_apply-login-asset-tickets",
    "summary": "tickets_apply-login-asset-tickets_open",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/LoginAssetReview"
    }
  },
  {
    "method": "GET",
    "path": "/tickets/apply-login-asset-tickets/{id}/",
    "basePath": "/api/v1",
    "operationId": "tickets_apply-login-asset-tickets_read",
    "tag": "tickets_apply-login-asset-tickets",
    "summary": "tickets_apply-login-asset-tickets_read",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ]
  },
  {
    "method": "PUT",
    "path": "/tickets/apply-login-asset-tickets/{id}/reject/",
    "basePath": "/api/v1",
    "operationId": "tickets_apply-login-asset-tickets_reject",
    "tag": "tickets_apply-login-asset-tickets",
    "summary": "tickets_apply-login-asset-tickets_reject",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/LoginAssetReview"
    }
  },
  {
    "method": "PATCH",
    "path": "/tickets/apply-login-tickets/{id}/approve/",
    "basePath": "/api/v1",
    "operationId": "tickets_apply-login-tickets_approve_partial_update",
    "tag": "tickets_apply-login-tickets",
    "summary": "tickets_apply-login-tickets_approve_partial_update",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/LoginReview"
    }
  },
  {
    "method": "PUT",
    "path": "/tickets/apply-login-tickets/{id}/approve/",
    "basePath": "/api/v1",
    "operationId": "tickets_apply-login-tickets_approve_update",
    "tag": "tickets_apply-login-tickets",
    "summary": "tickets_apply-login-tickets_approve_update",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/LoginReview"
    }
  },
  {
    "method": "PUT",
    "path": "/tickets/apply-login-tickets/bulk/",
    "basePath": "/api/v1",
    "operationId": "tickets_apply-login-tickets_bulk",
    "tag": "tickets_apply-login-tickets",
    "summary": "tickets_apply-login-tickets_bulk",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/LoginReview"
    }
  },
  {
    "method": "PUT",
    "path": "/tickets/apply-login-tickets/{id}/close/",
    "basePath": "/api/v1",
    "operationId": "tickets_apply-login-tickets_close",
    "tag": "tickets_apply-login-tickets",
    "summary": "tickets_apply-login-tickets_close",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/LoginReview"
    }
  },
  {
    "method": "GET",
    "path": "/tickets/apply-login-tickets/",
    "basePath": "/api/v1",
    "operationId": "tickets_apply-login-tickets_list",
    "tag": "tickets_apply-login-tickets",
    "summary": "tickets_apply-login-tickets_list",
    "queryParameters": [
      {
        "name": "id",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "search",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "order",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": []
  },
  {
    "method": "POST",
    "path": "/tickets/apply-login-tickets/open/",
    "basePath": "/api/v1",
    "operationId": "tickets_apply-login-tickets_open",
    "tag": "tickets_apply-login-tickets",
    "summary": "tickets_apply-login-tickets_open",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/LoginReview"
    }
  },
  {
    "method": "GET",
    "path": "/tickets/apply-login-tickets/{id}/",
    "basePath": "/api/v1",
    "operationId": "tickets_apply-login-tickets_read",
    "tag": "tickets_apply-login-tickets",
    "summary": "tickets_apply-login-tickets_read",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ]
  },
  {
    "method": "PUT",
    "path": "/tickets/apply-login-tickets/{id}/reject/",
    "basePath": "/api/v1",
    "operationId": "tickets_apply-login-tickets_reject",
    "tag": "tickets_apply-login-tickets",
    "summary": "tickets_apply-login-tickets_reject",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/LoginReview"
    }
  },
  {
    "method": "GET",
    "path": "/tickets/apply-nodes/suggestions/",
    "basePath": "/api/v1",
    "operationId": "tickets_apply-nodes_match",
    "tag": "tickets_apply-nodes",
    "summary": "tickets_apply-nodes_match",
    "queryParameters": [
      {
        "name": "search",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "order",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": []
  },
  {
    "method": "POST",
    "path": "/tickets/comments/",
    "basePath": "/api/v1",
    "operationId": "tickets_comments_create",
    "tag": "tickets_comments",
    "summary": "tickets_comments_create",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/Comment"
    }
  },
  {
    "method": "GET",
    "path": "/tickets/comments/",
    "basePath": "/api/v1",
    "operationId": "tickets_comments_list",
    "tag": "tickets_comments",
    "summary": "tickets_comments_list",
    "queryParameters": [
      {
        "name": "search",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "order",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": []
  },
  {
    "method": "GET",
    "path": "/tickets/comments/{id}/",
    "basePath": "/api/v1",
    "operationId": "tickets_comments_read",
    "tag": "tickets_comments",
    "summary": "tickets_comments_read",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ]
  },
  {
    "method": "PATCH",
    "path": "/tickets/tickets/{id}/approve/",
    "basePath": "/api/v1",
    "operationId": "tickets_tickets_approve_partial_update",
    "tag": "tickets_tickets",
    "summary": "tickets_tickets_approve_partial_update",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/Ticket"
    }
  },
  {
    "method": "PUT",
    "path": "/tickets/tickets/{id}/approve/",
    "basePath": "/api/v1",
    "operationId": "tickets_tickets_approve_update",
    "tag": "tickets_tickets",
    "summary": "tickets_tickets_approve_update",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/Ticket"
    }
  },
  {
    "method": "PUT",
    "path": "/tickets/tickets/bulk/",
    "basePath": "/api/v1",
    "operationId": "tickets_tickets_bulk",
    "tag": "tickets_tickets",
    "summary": "tickets_tickets_bulk",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/Ticket"
    }
  },
  {
    "method": "PUT",
    "path": "/tickets/tickets/{id}/close/",
    "basePath": "/api/v1",
    "operationId": "tickets_tickets_close",
    "tag": "tickets_tickets",
    "summary": "tickets_tickets_close",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/Ticket"
    }
  },
  {
    "method": "GET",
    "path": "/tickets/tickets/",
    "basePath": "/api/v1",
    "operationId": "tickets_tickets_list",
    "tag": "tickets_tickets",
    "summary": "tickets_tickets_list",
    "queryParameters": [
      {
        "name": "id",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "title",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "type",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "status",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "state",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "applicant",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "assignees__id",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "relevant_asset",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "relevant_command",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "applicant_username_name",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "search",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "order",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": []
  },
  {
    "method": "POST",
    "path": "/tickets/tickets/open/",
    "basePath": "/api/v1",
    "operationId": "tickets_tickets_open",
    "tag": "tickets_tickets",
    "summary": "tickets_tickets_open",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/Ticket"
    }
  },
  {
    "method": "GET",
    "path": "/tickets/tickets/{id}/",
    "basePath": "/api/v1",
    "operationId": "tickets_tickets_read",
    "tag": "tickets_tickets",
    "summary": "tickets_tickets_read",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ]
  },
  {
    "method": "PUT",
    "path": "/tickets/tickets/{id}/reject/",
    "basePath": "/api/v1",
    "operationId": "tickets_tickets_reject",
    "tag": "tickets_tickets",
    "summary": "tickets_tickets_reject",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/Ticket"
    }
  },
  {
    "method": "GET",
    "path": "/tickets/tickets/{ticket_id}/session/",
    "basePath": "/api/v1",
    "operationId": "tickets_tickets_session_list",
    "tag": "tickets_tickets",
    "summary": "tickets_tickets_session_list",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "ticket_id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ]
  },
  {
    "method": "POST",
    "path": "/users/connection-token/{id}/client-url/",
    "basePath": "/api/v1",
    "operationId": "users_connection-token_client-url_create",
    "tag": "users_connection-token",
    "summary": "users_connection-token_client-url_create",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/ConnectionToken"
    }
  },
  {
    "method": "GET",
    "path": "/users/connection-token/{id}/client-url/",
    "basePath": "/api/v1",
    "operationId": "users_connection-token_client-url_read",
    "tag": "users_connection-token",
    "summary": "users_connection-token_client-url_read",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ]
  },
  {
    "method": "POST",
    "path": "/users/connection-token/",
    "basePath": "/api/v1",
    "operationId": "users_connection-token_create",
    "tag": "users_connection-token",
    "summary": "users_connection-token_create",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/ConnectionToken"
    }
  },
  {
    "method": "POST",
    "path": "/users/connection-token/exchange/",
    "basePath": "/api/v1",
    "operationId": "users_connection-token_exchange",
    "tag": "users_connection-token",
    "summary": "users_connection-token_exchange",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/ConnectionToken"
    }
  },
  {
    "method": "PATCH",
    "path": "/users/connection-token/{id}/expire/",
    "basePath": "/api/v1",
    "operationId": "users_connection-token_expire",
    "tag": "users_connection-token",
    "summary": "users_connection-token_expire",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/ConnectionToken"
    }
  },
  {
    "method": "GET",
    "path": "/users/connection-token/",
    "basePath": "/api/v1",
    "operationId": "users_connection-token_list",
    "tag": "users_connection-token",
    "summary": "users_connection-token_list",
    "queryParameters": [
      {
        "name": "user_display",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "asset_display",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "search",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "order",
        "required": false,
        "schema": {
          "type": "string"
        }
      },
      {
        "name": "limit",
        "required": false,
        "schema": {
          "type": "integer"
        }
      },
      {
        "name": "offset",
        "required": false,
        "schema": {
          "type": "integer"
        }
      }
    ],
    "pathParameters": []
  },
  {
    "method": "POST",
    "path": "/users/connection-token/{id}/rdp-file/",
    "basePath": "/api/v1",
    "operationId": "users_connection-token_rdp-file_create",
    "tag": "users_connection-token",
    "summary": "users_connection-token_rdp-file_create",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/ConnectionToken"
    }
  },
  {
    "method": "GET",
    "path": "/users/connection-token/{id}/rdp-file/",
    "basePath": "/api/v1",
    "operationId": "users_connection-token_rdp-file_read",
    "tag": "users_connection-token",
    "summary": "users_connection-token_rdp-file_read",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ]
  },
  {
    "method": "GET",
    "path": "/users/connection-token/{id}/",
    "basePath": "/api/v1",
    "operationId": "users_connection-token_read",
    "tag": "users_connection-token",
    "summary": "users_connection-token_read",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ]
  },
  {
    "method": "POST",
    "path": "/users/connection-token/render-to-json/",
    "basePath": "/api/v1",
    "operationId": "users_connection-token_render_to_json",
    "tag": "users_connection-token",
    "summary": "users_connection-token_render_to_json",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/ConnectionToken"
    }
  },
  {
    "method": "PATCH",
    "path": "/users/connection-token/{id}/reuse/",
    "basePath": "/api/v1",
    "operationId": "users_connection-token_reuse",
    "tag": "users_connection-token",
    "summary": "users_connection-token_reuse",
    "queryParameters": [],
    "pathParameters": [
      {
        "name": "id",
        "required": true,
        "schema": {
          "type": "string"
        }
      }
    ],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/ConnectionToken"
    }
  },
  {
    "method": "PATCH",
    "path": "/users/profile/",
    "basePath": "/api/v1",
    "operationId": "users_profile_partial_update",
    "tag": "users_profile",
    "summary": "users_profile_partial_update",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/UserProfile"
    }
  },
  {
    "method": "PATCH",
    "path": "/users/profile/password/",
    "basePath": "/api/v1",
    "operationId": "users_profile_password_partial_update",
    "tag": "users_profile",
    "summary": "users_profile_password_partial_update",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/UserUpdatePassword"
    }
  },
  {
    "method": "GET",
    "path": "/users/profile/password/",
    "basePath": "/api/v1",
    "operationId": "users_profile_password_read",
    "tag": "users_profile",
    "summary": "users_profile_password_read",
    "queryParameters": [],
    "pathParameters": []
  },
  {
    "method": "PUT",
    "path": "/users/profile/password/",
    "basePath": "/api/v1",
    "operationId": "users_profile_password_update",
    "tag": "users_profile",
    "summary": "users_profile_password_update",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/UserUpdatePassword"
    }
  },
  {
    "method": "PATCH",
    "path": "/users/profile/public-key/",
    "basePath": "/api/v1",
    "operationId": "users_profile_public-key_partial_update",
    "tag": "users_profile",
    "summary": "users_profile_public-key_partial_update",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/UserUpdatePublicKey"
    }
  },
  {
    "method": "GET",
    "path": "/users/profile/public-key/",
    "basePath": "/api/v1",
    "operationId": "users_profile_public-key_read",
    "tag": "users_profile",
    "summary": "users_profile_public-key_read",
    "queryParameters": [],
    "pathParameters": []
  },
  {
    "method": "PUT",
    "path": "/users/profile/public-key/",
    "basePath": "/api/v1",
    "operationId": "users_profile_public-key_update",
    "tag": "users_profile",
    "summary": "users_profile_public-key_update",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/UserUpdatePublicKey"
    }
  },
  {
    "method": "GET",
    "path": "/users/profile/",
    "basePath": "/api/v1",
    "operationId": "users_profile_read",
    "tag": "users_profile",
    "summary": "users_profile_read",
    "queryParameters": [],
    "pathParameters": []
  },
  {
    "method": "PUT",
    "path": "/users/profile/",
    "basePath": "/api/v1",
    "operationId": "users_profile_update",
    "tag": "users_profile",
    "summary": "users_profile_update",
    "queryParameters": [],
    "pathParameters": [],
    "bodyRequired": true,
    "bodySchema": {
      "ref": "#/definitions/UserProfile"
    }
  }
];
