## logseq-deadline-countdown

Counts how many days left until the deadline.

![demo](./demo.png)

By the way, here's a query to collect all deadlines within a range in case you need it.

```
#+BEGIN_QUERY
{
  :title "all deadline or schedule within 21 days"
  :query [:find (pull ?block [*])
          :in $ ?start ?next
          :where
           (or
            [?block :block/scheduled ?d]
            [?block :block/deadline ?d]
           )
           [(> ?d ?start)]
           [(< ?d ?next)]
         ]
  :inputs [:today :21d-after]
}
#+END_QUERY
```
