import swaggerJSDoc from 'swagger-jsdoc';

// Basic Swagger/OpenAPI configuration using swagger-jsdoc
const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'LedgerSwap API',
      version: '1.0.0',
      description: 'API documentation for LedgerSwap backend',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
    servers: [
      {
        url: `https://ledger-swap-backend.vercel.app`,
      },
    ],
    paths: {
      '/': {
        get: {
          summary: 'Health check endpoint',
          tags: ['Health'],
          responses: {
            '200': {
              description: 'API is running',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      status: { type: 'string' },
                      timestamp: { type: 'string' },
                      version: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/health': {
        get: {
          summary: 'Service health status',
          tags: ['Health'],
          responses: {
            '200': {
              description: 'Service is healthy'
            }
          }
        }
      },
      '/api/kucoin/test-connection': {
        get: {
          summary: 'Test KuCoin API connection',
          tags: ['KuCoin'],
          responses: {
            '200': {
              description: 'KuCoin API connection successful',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      hasCredentials: { type: 'boolean' },
                      accountsCount: { type: 'number' },
                      timestamp: { type: 'string' }
                    }
                  }
                }
              }
            },
            '400': {
              description: 'KuCoin API credentials not configured',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      missing: {
                        type: 'object',
                        properties: {
                          apiKey: { type: 'boolean' },
                          apiSecret: { type: 'boolean' },
                          passphrase: { type: 'boolean' }
                        }
                      }
                    }
                  }
                }
              }
            },
            '500': {
              description: 'KuCoin API connection failed'
            }
          }
        }
      },
      '/api/kucoin/test-deposit-address': {
        post: {
          summary: 'Test deposit address generation',
          tags: ['KuCoin'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['currency', 'chain'],
                  properties: {
                    currency: { 
                      type: 'string',
                      enum: ['BTC', 'XRP', 'XLM', 'XDC'],
                      example: 'BTC'
                    },
                    chain: { 
                      type: 'string',
                      enum: ['btc', 'xrp', 'xlm', 'xdc'],
                      example: 'btc'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Deposit address generated successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      address: { type: 'string' },
                      currency: { type: 'string' },
                      chain: { type: 'string' },
                      result: { type: 'object' }
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Invalid request parameters'
            },
            '500': {
              description: 'Failed to generate deposit address'
            }
          }
        }
      },
      '/api/kucoin/status': {
        get: {
          summary: 'Get KuCoin monitoring service status',
          tags: ['KuCoin'],
          responses: {
            '200': {
              description: 'Service status retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      isRunning: { type: 'boolean' },
                      activeExchanges: { type: 'number' },
                      totalProcessed: { type: 'number' },
                      lastCheck: { type: 'string' },
                      uptime: { type: 'string' }
                    }
                  }
                }
              }
            },
            '500': {
              description: 'Failed to get service status'
            }
          }
        }
      },
      '/api/kucoin/start': {
        post: {
          summary: 'Start KuCoin monitoring service',
          tags: ['KuCoin'],
          responses: {
            '200': {
              description: 'KuCoin monitoring service started successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      status: { type: 'string' }
                    }
                  }
                }
              }
            },
            '500': {
              description: 'Failed to start monitoring service'
            }
          }
        }
      },
      '/api/kucoin/stop': {
        post: {
          summary: 'Stop KuCoin monitoring service',
          tags: ['KuCoin'],
          responses: {
            '200': {
              description: 'KuCoin monitoring service stopped successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      status: { type: 'string' }
                    }
                  }
                }
              }
            },
            '500': {
              description: 'Failed to stop monitoring service'
            }
          }
        }
      },
      '/api/kucoin/addresses': {
        get: {
          summary: 'Get all deposit addresses',
          tags: ['KuCoin'],
          responses: {
            '200': {
              description: 'Deposit addresses retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      addresses: { type: 'object' },
                      supportedChains: { type: 'object' }
                    }
                  }
                }
              }
            },
            '500': {
              description: 'Failed to get deposit addresses'
            }
          }
        }
      },
      '/api/kucoin/exchanges/active': {
        get: {
          summary: 'Get active exchanges being monitored',
          tags: ['KuCoin'],
          responses: {
            '200': {
              description: 'Active exchanges retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      count: { type: 'number' },
                      exchanges: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            exchangeId: { type: 'string' },
                            status: { type: 'string' },
                            kucoinDepositAddress: { type: 'string' },
                            from: { type: 'object' },
                            to: { type: 'object' },
                            expiresAt: { type: 'string' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            '500': {
              description: 'Failed to get active exchanges'
            }
          }
        }
      },
      '/api/kucoin/exchanges/expired': {
        get: {
          summary: 'Get expired exchanges',
          tags: ['KuCoin'],
          responses: {
            '200': {
              description: 'Expired exchanges retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      count: { type: 'number' },
                      exchanges: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            exchangeId: { type: 'string' },
                            status: { type: 'string' },
                            expiresAt: { type: 'string' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            '500': {
              description: 'Failed to get expired exchanges'
            }
          }
        }
      },
      '/api/kucoin/exchanges/{exchangeId}/retry': {
        post: {
          summary: 'Retry a failed exchange',
          tags: ['KuCoin'],
          parameters: [
            {
              name: 'exchangeId',
              in: 'path',
              required: true,
              schema: {
                type: 'string'
              },
              description: 'Exchange ID to retry'
            }
          ],
          responses: {
            '200': {
              description: 'Exchange retry initiated successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      exchangeId: { type: 'string' },
                      newStatus: { type: 'string' }
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Exchange cannot be retried'
            },
            '404': {
              description: 'Exchange not found'
            },
            '500': {
              description: 'Failed to retry exchange'
            }
          }
        }
      },
      '/api/kucoin/supported-currencies': {
        get: {
          summary: 'Get supported currencies for KuCoin integration',
          tags: ['KuCoin'],
          responses: {
            '200': {
              description: 'Supported currencies retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      currencies: {
                        type: 'array',
                        items: { type: 'string' }
                      },
                      chains: {
                        type: 'object',
                        properties: {
                          XDC: {
                            type: 'object',
                            properties: {
                              currency: { type: 'string' },
                              chain: { type: 'string' }
                            }
                          },
                          BTC: {
                            type: 'object',
                            properties: {
                              currency: { type: 'string' },
                              chain: { type: 'string' }
                            }
                          },
                          XLM: {
                            type: 'object',
                            properties: {
                              currency: { type: 'string' },
                              chain: { type: 'string' }
                            }
                          },
                          XRP: {
                            type: 'object',
                            properties: {
                              currency: { type: 'string' },
                              chain: { type: 'string' }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  // Look for JSDoc comments in both source and compiled files
  apis: ['src/routes/**/*.ts', 'src/controllers/**/*.ts', 'dist/routes/**/*.js', 'dist/controllers/**/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;
